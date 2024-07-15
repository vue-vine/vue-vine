import type { Disposable, LanguageServicePlugin, Position } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { type VueCompilerOptions, resolveVueCompilerOptions } from '@vue/language-core'
import { create as createHtmlService } from 'volar-service-html'
import type { IHTMLDataProvider, ITagData } from 'vscode-html-languageservice'
import { newHTMLDataProvider } from 'vscode-html-languageservice'
import type { VueVineCode } from '@vue-vine/language-service'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { vueTemplateBuiltinData } from '../data/vue-template-built-in'

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
    documentSelector: ['.html'],
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
        async provideCompletionItems(document, position, completionContext, triggerCharToken) {
          let sync: (() => Promise<number>) | undefined
          let currentVersion: number | undefined

          const docUri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(docUri)
          const sourceScript = decoded && context.language.scripts.get(decoded[0])
          const virtualCode = sourceScript?.generated?.root

          if (virtualCode && isVueVineVirtualCode(virtualCode)) {
            // Precompute HTMLDocument before provideHtmlData to avoid parseHTMLDocument requesting component names from tsserver
            baseServiceInstance.provideCompletionItems?.(document, position, completionContext, triggerCharToken)
            sync = (await provideHtmlData(
              vueCompilerOptions,
              sourceScript.id,
              virtualCode,
              position,
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
        position: Position,
      ): IHTMLDataProvider {
        return {
          getId: () => 'vine-vue-template',
          isApplicable: () => true,
          provideTags() {
            const tags: ITagData[] = []

            const triggerLine = position.line
            const triggerAtVineCompFn = vineVirtualCode.vineMetaCtx.vineFileCtx.vineCompFns.find(
              (compFn) => {
                const { templateStringNode } = compFn
                return (
                  templateStringNode?.loc
                  && triggerLine >= templateStringNode.loc.start.line
                  && triggerLine <= templateStringNode.loc.end.line
                )
                  ? compFn
                  : undefined
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

      async function provideHtmlData(
        vueCompilerOptions: VueCompilerOptions,
        sourceDocumentUri: URI,
        vineVirtualCode: VueVineCode,
        position: Position,
      ) {
        const promises: Promise<void>[] = []
        // const tagInfos = new Map<string, HtmlTagInfo>()

        let version = 0

        updateCustomData([
          newHTMLDataProvider('vine-vue-template-built-in', vueTemplateBuiltinData),
          createVineTemplateDataProvider(vineVirtualCode, position),
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
