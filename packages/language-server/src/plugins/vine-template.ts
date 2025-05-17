import type {
  Diagnostic,
  Disposable,
  LanguageServiceContext,
  LanguageServicePlugin,
} from '@volar/language-service'
import type { VineDiagnostic, VineFnCompCtx } from '@vue-vine/compiler'
import type { VueVineCode } from '@vue-vine/language-service'
import type { IAttributeData, IHTMLDataProvider, ITagData, TextDocument } from 'vscode-html-languageservice'
import type { HtmlTagInfo, PipelineContext } from '../types'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { hyphenateAttr } from '@vue/language-core'
import { create as createHtmlService } from 'volar-service-html'
import { newHTMLDataProvider } from 'vscode-html-languageservice'
import { URI } from 'vscode-uri'
import { vueTemplateBuiltinData } from '../data/vue-template-built-in'
import { getComponentPropsFromPipeline } from '../pipeline/get-component-props'

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

export function isTemplateDiagnosticOfVineCompName(vineDiag: VineDiagnostic, vineCompName: string | undefined) {
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

          // #4298: Precompute HTMLDocument before provideHtmlData to avoid parseHTMLDocument requesting component names from tsserver
          baseServiceInstance.provideCompletionItems?.(document, position, completionContext, triggerCharToken)

          // Set up HTML data providers before requesting completions
          const { sync } = provideHtmlData(
            tagInfos,
            vineVirtualCode,
            triggerAtVineCompFn,
          )

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
        vineVirtualCode: VueVineCode,
        triggerAtVineCompFn: VineFnCompCtx,
      ) {
        const templateBuiltIn = newHTMLDataProvider(
          'vine-vue-template-built-in',
          vueTemplateBuiltinData,
        )
        const vineVolarContextProvider = createVineTemplateDataProvider()

        let pipelineStatus: PipelineContext = {
          pendingRequests: new Map(),
        }

        updateCustomData([
          templateBuiltIn,
          vineVolarContextProvider,
        ])

        return {
          async sync() {
            if (pipelineStatus.pendingRequests.size > 0) {
              try {
                const pendingPromises = Array
                  .from(pipelineStatus.pendingRequests.values())
                  .map(
                    resolver => new Promise<void>((resolve, reject) => {
                      const originalResolve = resolver.resolve
                      const originalReject = resolver.reject

                      resolver.resolve = (value) => {
                        originalResolve(value)
                        resolve()
                      }

                      resolver.reject = (reason) => {
                        originalReject(reason)
                        reject(reason)
                      }
                    }),
                  )

                await Promise.allSettled(pendingPromises)
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

              if (triggerAtVineCompFn) {
                // If trigger on a tag that references a local component(in current file),
                // we recompute tagInfo
                tagInfo = {
                  props: Object.keys(triggerAtVineCompFn.props).map(prop => hyphenateAttr(prop)),
                  events: triggerAtVineCompFn.emits.map(emit => hyphenateAttr(emit)),
                }
                tagInfos.set(tag, tagInfo)
              }
              else if (!tagInfo) {
                // Trigger on a tag that references a external component,
                // and we only fetch once
                try {
                  const tsConfigFileName = context.project.typescript!.configFileName!
                  const tsHost = context.project.typescript!.sys
                  getComponentPropsFromPipeline(
                    tag,
                    {
                      tagInfos,
                      vineVirtualCode,
                      pipelineStatus,
                      tsConfigFileName,
                      tsHost,
                    },
                  ).catch((err) => {
                    console.error(`Failed to fetch props for component ${tag}:`, err)
                  })
                }
                catch (err) {
                  console.error(`Error creating pipeline request for ${tag}:`, err)
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

  function updateCustomData(extraData: IHTMLDataProvider[]) {
    customData = extraData
    onDidChangeCustomDataListeners.forEach(l => l())
  }
}
