import type {
  Diagnostic,
  Disposable,
  LanguageServiceContext,
  LanguageServicePlugin,
} from '@volar/language-service'
import type { VineDiagnostic, VineFnCompCtx } from '@vue-vine/compiler'
import type { VueVineVirtualCode } from '@vue-vine/language-service'
import type { IAttributeData, IHTMLDataProvider, ITagData, TextDocument } from 'vscode-html-languageservice'
import type { PipelineClientContext } from '../pipeline/shared'
import type { HtmlTagInfo } from '../types'
import { VinePropsDefinitionBy } from '@vue-vine/compiler'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { hyphenateAttr } from '@vue/language-core'
import { create as createHtmlService } from 'volar-service-html'
import { newHTMLDataProvider } from 'vscode-html-languageservice'
import { URI } from 'vscode-uri'
import { vueTemplateBuiltinData } from '../data/vue-template-built-in'
import { getComponentPropsFromPipeline } from '../pipeline/get-component-props'
import { getElementAttrsFromPipeline } from '../pipeline/get-element-attrs'

const EMBEDDED_TEMPLATE_SUFFIX = /_template$/
const CAMEL_CASE_EVENT_PREFIX = /on[A-Z]/

function getVueVineVirtualCode(
  document: TextDocument,
  context: LanguageServiceContext,
) {
  const docUri = URI.parse(document.uri)
  const [sourceScriptId] = context.decodeEmbeddedDocumentUri(docUri) ?? []
  const sourceScript = sourceScriptId && context.language.scripts.get(sourceScriptId)
  const vineVirtualCode = sourceScript?.generated?.root

  return {
    docUri,
    sourceScriptId,
    sourceScript,
    vineVirtualCode,
  }
}

export function transformVineDiagnostic(
  document: TextDocument,
  diag: VineDiagnostic,
  type: 'err' | 'warn',
): Diagnostic {
  const start = diag.rawVueTemplateLocation?.start.offset ?? 0
  const end = diag.rawVueTemplateLocation?.end.offset ?? 0

  return {
    severity: type === 'err' ? 1 : 2,
    source: 'vue-vine',
    message: diag.msg,
    range: {
      start: document.positionAt(start),
      end: document.positionAt(end),
    },
  }
}

export function isTemplateDiagnosticOfVineCompName(vineDiag: VineDiagnostic, vineCompName: string | undefined): boolean {
  return (
    vineDiag.rawVueTemplateLocation != null
    && vineDiag.vineCompFnCtx?.fnName.toLowerCase() === vineCompName?.toLowerCase()
  )
}

export function createVineTemplatePlugin(): LanguageServicePlugin {
  let customData: IHTMLDataProvider[] = []
  const tagInfosMap = new Map<string, Map<string, HtmlTagInfo>>()

  const onDidChangeCustomDataListeners = new Set<() => void>()
  const onDidChangeCustomData = (listener: () => void): Disposable => {
    onDidChangeCustomDataListeners.add(listener)
    return {
      dispose() {
        onDidChangeCustomDataListeners.delete(listener)
      },
    }
  }
  const updateCustomData = (extraData: IHTMLDataProvider[]) => {
    customData = extraData
    onDidChangeCustomDataListeners.forEach(l => l())
  }
  const baseService = createHtmlService({
    documentSelector: ['html'],
    getCustomData() {
      return [
        ...customData,
      ]
    },
    onDidChangeCustomData,
  })

  return {
    name: 'vue-vine-template',
    capabilities: {
      ...baseService.capabilities,
      completionProvider: {
        triggerCharacters: [
          ...baseService.capabilities.completionProvider?.triggerCharacters ?? [],
          '@', // vue event shorthand
          ':', // vue bind shorthand
        ],
      },
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },
    create(context) {
      const baseServiceInstance = baseService.create(context)

      return {
        ...baseServiceInstance,
        dispose() {
          baseServiceInstance.dispose?.()
        },
        async provideCompletionItems(document, position, completionContext, triggerCharToken) {
          if (document.languageId !== 'html') {
            return
          }
          const { docUri, sourceScriptId, vineVirtualCode } = getVueVineVirtualCode(document, context)
          if (!sourceScriptId || !vineVirtualCode || !isVueVineVirtualCode(vineVirtualCode)) {
            return
          }
          const htmlEmbeddedId = docUri.authority.replace(EMBEDDED_TEMPLATE_SUFFIX, '')
          const triggerAtVineCompFn = vineVirtualCode.vineMetaCtx.vineFileCtx.vineCompFns.find(
            (compFn, i) => `${i}_${compFn.fnName}`.toLowerCase() === htmlEmbeddedId,
          )
          if (!triggerAtVineCompFn) {
            return
          }

          let tagInfos: Map<string, HtmlTagInfo>
          if (!tagInfosMap.has(vineVirtualCode.fileName)) {
            tagInfos = new Map()
            tagInfosMap.set(vineVirtualCode.fileName, tagInfos)
          }
          else {
            tagInfos = tagInfosMap.get(vineVirtualCode.fileName)!
          }

          // Set up HTML data providers before requesting completions
          const { sync } = provideHtmlData(
            tagInfos,
            vineVirtualCode,
            triggerAtVineCompFn,
          )

          // #4298: Precompute HTMLDocument before provideHtmlData to avoid parseHTMLDocument requesting component names from tsserver
          await baseServiceInstance.provideCompletionItems?.(document, position, completionContext, triggerCharToken)

          // Wait for all pipeline requests to complete
          await sync()

          // Get completions only once after all data is ready
          const htmlComplete = await baseServiceInstance.provideCompletionItems?.(
            document,
            position,
            completionContext,
            triggerCharToken,
          )

          return htmlComplete
        },
        async provideDiagnostics(document) {
          if (document.languageId !== 'html') {
            return []
          }

          const { docUri, sourceScript, vineVirtualCode } = getVueVineVirtualCode(document, context)
          if (
            !vineVirtualCode
            || !sourceScript
            || !isVueVineVirtualCode(vineVirtualCode)
          ) {
            return []
          }
          const htmlEmbeddedId = docUri.authority.replace(EMBEDDED_TEMPLATE_SUFFIX, '')
          const vineCompFnNameLowerCase = htmlEmbeddedId.split('_').at(1)

          const vineTemplateErrs = (
            vineVirtualCode.vineMetaCtx.vineCompileErrs
              ?.filter(diag => isTemplateDiagnosticOfVineCompName(diag, vineCompFnNameLowerCase))
              ?? []
          )
          const vineTemplateWarns = (
            vineVirtualCode.vineMetaCtx.vineCompileWarns
              ?.filter(diag => isTemplateDiagnosticOfVineCompName(diag, vineCompFnNameLowerCase))
              ?? []
          )

          const results: Diagnostic[] = [
            ...vineTemplateErrs.map(err => transformVineDiagnostic(document, err, 'err')),
            ...vineTemplateWarns.map(warn => transformVineDiagnostic(document, warn, 'warn')),
          ]
          return results
        },
      }

      function provideHtmlData(
        tagInfos: Map<string, HtmlTagInfo>,
        vineVirtualCode: VueVineVirtualCode,
        triggerAtVineCompFn: VineFnCompCtx,
      ) {
        const templateBuiltIn = newHTMLDataProvider(
          'vine-vue-template-built-in',
          vueTemplateBuiltinData,
        )
        const vineVolarContextProvider = createVineTemplateDataProvider()
        const tsConfigFileName = context.project.typescript!.configFileName!
        const tsHost = context.project.typescript!.sys
        const pipelineClientContext: PipelineClientContext = {
          tagInfos,
          vineVirtualCode,
          pendingRequests: new Map(),
          tsConfigFileName,
          tsHost,
        }

        updateCustomData([
          templateBuiltIn,
          vineVolarContextProvider,
        ])

        return {
          async sync() {
            const { pendingRequests } = pipelineClientContext
            if (pendingRequests.size > 0) {
              try {
                await Promise.allSettled(
                  Array.from(pendingRequests.values()),
                )

                updateCustomData([
                  templateBuiltIn,
                  vineVolarContextProvider,
                ])
              }
              catch (err) {
                console.error('Error waiting for pipeline requests:', err)
              }
            }

            return true
          },
        }

        function createVineTemplateDataProvider(): IHTMLDataProvider {
          return {
            getId: () => 'vine-vue-template',
            isApplicable: () => true,
            provideTags: () => {
              const tags: ITagData[] = []

              const { bindings } = triggerAtVineCompFn
              Object.keys(bindings).forEach((bindingName) => {
                tags.push({
                  name: bindingName,
                  attributes: [],
                })
              })

              return tags
            },
            provideAttributes: (tag) => {
              const tagAttrs: IAttributeData[] = []
              let tagInfo = tagInfos.get(tag)
              const triggerAtVineCompFn = vineVirtualCode.vineMetaCtx.vineFileCtx.vineCompFns.find(
                (compFn) => {
                  return compFn.fnName === tag
                },
              )

              if (triggerAtVineCompFn?.propsDefinitionBy === VinePropsDefinitionBy.typeLiteral) {
                // If trigger on a tag that references a local component(in current file),
                // we recompute tagInfo
                tagInfo = {
                  props: Object.keys(triggerAtVineCompFn.props).map(prop => hyphenateAttr(prop)),
                  events: triggerAtVineCompFn.emits.map(emit => hyphenateAttr(emit)),
                }
                tagInfos.set(tag, tagInfo)
              }
              else if (!tagInfo) {
                // Trigger on a tag that may be:
                //  - a native HTML element
                //  - references a external component, that we need to fetch props from pipeline
                try {
                  getComponentPropsFromPipeline(tag, pipelineClientContext)
                  getElementAttrsFromPipeline(tag, pipelineClientContext)
                }
                catch (err) {
                  console.error(`Failed to fetch info for tag ${tag} from pipeline:`, err)
                }

                return tagAttrs
              }

              const { props, events } = tagInfo
              const attributes: IAttributeData[] = []

              for (const prop of props) {
                const isEvent = prop.startsWith('on-') || CAMEL_CASE_EVENT_PREFIX.test(prop)

                if (isEvent) {
                  const propNameBase = prop.startsWith('on-')
                    ? prop.slice('on-'.length)
                    : (prop['on'.length].toLowerCase() + prop.slice('onX'.length))

                  attributes.push(
                    { name: `v-on:${propNameBase}` },
                    { name: `@${propNameBase}` },
                  )
                }
                else {
                  attributes.push(
                    { name: prop },
                    { name: `:${prop}` },
                    { name: `v-bind:${prop}` },
                  )
                }
              }
              for (const event of events) {
                const name = hyphenateAttr(event)

                attributes.push(
                  { name: `v-on:${name}` },
                  { name: `@${name}` },
                )
              }

              return attributes
            },
            provideValues: () => [],
          }
        }
      }
    },
  }
}
