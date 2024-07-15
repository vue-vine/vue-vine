import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { type VueCompilerOptions, resolveVueCompilerOptions } from '@vue/language-core'
import { create as createHtmlService } from 'volar-service-html'
import type { IHTMLDataProvider } from 'vscode-html-languageservice'
import type { VueVineCode } from '@vue-vine/language-service'
import { isVueVineVirtualCode } from '@vue-vine/language-service'

declare module '@volar/language-service' {
  export interface ProjectContext {
    vue?: {
      compilerOptions: VueCompilerOptions
    }
  }
}

interface HtmlTagInfo {
  attrs: string[]
  props: string[]
  events: string[]
}

export function createVineDiagnostics(): LanguageServicePlugin {
  let customData: IHTMLDataProvider[] = []
  const baseService = createHtmlService({
    documentSelector: ['.html'],
    getCustomData() {
      return [
        ...customData,
      ]
    },
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
            )).sync
            currentVersion = await sync()
          }

          return null
        },
      }

      async function provideHtmlData(
        vueCompilerOptions: VueCompilerOptions,
        sourceDocumentUri: URI,
        vineVirtualCode: VueVineCode,
      ) {
        const promises: Promise<void>[] = []
        const tagInfos = new Map<string, HtmlTagInfo>()

        let version = 0

        return {
          async sync() {
            await Promise.all(promises)
            return version
          },
        }
      }
    },
  }
}
