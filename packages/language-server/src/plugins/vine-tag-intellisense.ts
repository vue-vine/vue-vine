import type { Disposable, LanguageServicePlugin, LanguageServicePluginInstance, SourceScript } from '@volar/language-service'
import type { VueVineCode } from '@vue-vine/language-service'
import type { IHTMLDataProvider, ITagData, TextDocument } from 'vscode-html-languageservice'
import { type VueCompilerOptions, resolveVueCompilerOptions } from '@vue/language-core'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import type * as vscode from 'vscode-languageserver-protocol'
import { create as createHtmlService } from 'volar-service-html'
import { newHTMLDataProvider } from 'vscode-html-languageservice'
import { URI } from 'vscode-uri'
import { vueTemplateBuiltinData } from '../data/vue-template-built-in'

const EMBEDDED_TEMPLATE_SUFFIX = /_template$/

export function createVineTagIntellisense(): LanguageServicePlugin {
  let customData: IHTMLDataProvider[] = []

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
    name: 'Vine Template Tag Intellisense',
    capabilities: {
      ...baseService.capabilities,
      completionProvider: {
        triggerCharacters: [
          ...baseService.capabilities.completionProvider?.triggerCharacters ?? [],
          '@', // vue event shorthand
        ],
      },
    },
    create(context) {
      const baseServiceInstance = baseService.create(context)
      // @ts-expect-error - The 'vue' field may not exist
      const vueCompilerOptions = context.project.vue?.compilerOptions ?? resolveVueCompilerOptions({})

      return {
        ...baseServiceInstance,
        dispose() {
          baseServiceInstance.dispose?.()
        },
        async provideCompletionItems(document, position, completionContext, triggerCharToken) {
          if (!isSupportedDocument(document)) {
            return
          }

          let sync: (() => Promise<number>) | undefined
          let currentVersion: number | undefined

          const docUri = URI.parse(document.uri)
          const htmlEmbeddedId = docUri.authority.replace(EMBEDDED_TEMPLATE_SUFFIX, '')
          const decoded = context.decodeEmbeddedDocumentUri(docUri)
          const sourceScript = decoded && context.language.scripts.get(decoded[0])
          const vineVirtualCode = decoded && sourceScript?.generated?.root
          if (!vineVirtualCode) {
            return
          }

          if (
            sourceScript && vineVirtualCode && htmlEmbeddedId
            && isVueVineVirtualCode(vineVirtualCode)
          ) {
            // Precompute HTMLDocument before provideHtmlData to avoid parseHTMLDocument requesting component names from tsserver
            baseServiceInstance.provideCompletionItems?.(document, position, completionContext, triggerCharToken)

            sync = (await provideHtmlData(
              vueCompilerOptions,
              sourceScript,
              vineVirtualCode,
              htmlEmbeddedId,
            )).sync
            currentVersion = await sync()
          }

          let htmlComplete = await baseServiceInstance.provideCompletionItems?.(document, position, completionContext, triggerCharToken)
          while (true) {
            const newVersion = await sync?.()
            if (currentVersion === newVersion) {
              break
            }
            currentVersion = newVersion
            htmlComplete = await baseServiceInstance.provideCompletionItems?.(document, position, completionContext, triggerCharToken)
          }
          if (!htmlComplete) {
            return
          }

          return htmlComplete
        },
      }

      function createVineTemplateDataProvider(
        vineVirtualCode: VueVineCode,
        htmlEmbeddedId: string,
      ): IHTMLDataProvider {
        return {
          getId: () => 'vine-vue-template',
          isApplicable: () => true,
          provideTags() {
            const tags: ITagData[] = []

            const triggerAtVineCompFn = vineVirtualCode.vineMetaCtx.vineFileCtx.vineCompFns.find(
              (compFn, i) => {
                return `${i}_${compFn.fnName}`.toLowerCase() === htmlEmbeddedId
              },
            )
            if (!triggerAtVineCompFn) {
              return tags
            }

            const { bindings } = triggerAtVineCompFn
            Object.keys(bindings).forEach((bindingName) => {
              tags.push({
                name: bindingName,
                attributes: [],
              })
            })

            return tags
          },
          provideAttributes() {
            const attributes: ITagData[] = []

            // Todo: provide attrs intellisense for Vine template

            return attributes
          },
          provideValues: () => [],
        }
      }

      function isSupportedDocument(document: TextDocument) {
        return document.languageId === 'html'
      }

      // eslint-disable-next-line unused-imports/no-unused-vars
      function getScanner(service: LanguageServicePluginInstance, document: TextDocument) {
        return service.provide['html/languageService']().createScanner(document.getText())
      }

      async function provideHtmlData(
        vueCompilerOptions: VueCompilerOptions,
        sourceScript: SourceScript,
        vineVirtualCode: VueVineCode,
        htmlEmbeddedId: string,
      ) {
        const promises: Promise<void>[] = []
        // const tagInfos = new Map<string, HtmlTagInfo>()

        let version = 0

        updateCustomData([
          newHTMLDataProvider('vine-vue-template-built-in', vueTemplateBuiltinData),
          createVineTemplateDataProvider(vineVirtualCode, htmlEmbeddedId),
        ])

        return {
          async sync() {
            await Promise.all(promises)
            return version
          },
        }
      }
    },
  }

  function updateCustomData(extraData: IHTMLDataProvider[]) {
    customData = extraData
    onDidChangeCustomDataListeners.forEach(l => l())
  }
}
