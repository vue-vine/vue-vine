/* eslint-disable unused-imports/no-unused-vars */ // Todo: Delete after development

import type {
  Disposable,
  LanguageServiceContext,
  LanguageServicePlugin,
  LanguageServicePluginInstance,
  SourceScript,
} from '@volar/language-service'
import type { VueVineCode } from '@vue-vine/language-service'
import type { IAttributeData, IHTMLDataProvider, ITagData, TextDocument } from 'vscode-html-languageservice'
import { hyphenateAttr, resolveVueCompilerOptions, type VueCompilerOptions } from '@vue/language-core'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { create as createHtmlService } from 'volar-service-html'
import { newHTMLDataProvider } from 'vscode-html-languageservice'
import { URI } from 'vscode-uri'
import { vueTemplateBuiltinData } from '../data/vue-template-built-in'

const EMBEDDED_TEMPLATE_SUFFIX = /_template$/

interface HtmlTagInfo {
  attrs: string[]
  events: string[]
  propsInfo: {
    name: string
    commentMarkdown: string
  }[]
}
interface CreateVineTagIntellisenseOptions {
  getTsPluginClient?: (context: LanguageServiceContext) => typeof import('../../../language-service/typescript-plugin/client') | undefined
}
type InternalItemId =
  | 'componentEvent'
  | 'componentProp'
  | 'specialTag'

export function createVineTagIntellisense(
  { getTsPluginClient }: CreateVineTagIntellisenseOptions,
): LanguageServicePlugin {
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
      const tsPluginClient = getTsPluginClient?.(context)

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
        context: {
          tagInfos: Map<string, HtmlTagInfo>
          promises: Promise<void>[]
          version: { value: number }
        },
      ): IHTMLDataProvider {
        const {
          tagInfos,
          promises,
          version,
        } = context

        return {
          getId: () => 'vine-vue-template',
          isApplicable: () => true,
          provideTags: () => {
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
          provideAttributes: (tag) => {
            const tagInfo = tagInfos.get(tag)

            if (!tagInfo) {
              promises.push((async () => {
                const attrs = await tsPluginClient?.getElementAttrs(vineVirtualCode.fileName, tag) ?? []
                const propsInfo = await tsPluginClient?.getComponentProps(vineVirtualCode.fileName, tag) ?? []
                const events = await tsPluginClient?.getComponentEvents(vineVirtualCode.fileName, tag) ?? []
                tagInfos.set(tag, {
                  attrs,
                  propsInfo: propsInfo.filter(prop => !prop.name.startsWith('ref_')),
                  events,
                })
                version.value += 1
              })())
              return []
            }

            const { attrs, propsInfo, events } = tagInfo
            const props = propsInfo.map(prop => prop.name)
            const attributes: IAttributeData[] = []
            const propsSet = new Set(props)

            for (const prop of [...props, ...attrs]) {
              const isGlobal = !propsSet.has(prop)
              const name = hyphenateAttr(prop)

              const isEvent = hyphenateAttr(name).startsWith('on-')

              if (isEvent) {
                const propNameBase = name.startsWith('on-')
                  ? name.slice('on-'.length)
                  : (name['on'.length].toLowerCase() + name.slice('onX'.length))
                const propKey = parseItemKey('componentEvent', isGlobal ? '*' : tag, propNameBase)

                attributes.push(
                  {
                    name: `v-on:${propNameBase}`,
                    description: propKey,
                  },
                  {
                    name: `@${propNameBase}`,
                    description: propKey,
                  },
                )
              }
              else {
                const propName = name
                const propKey = parseItemKey('componentProp', isGlobal ? '*' : tag, propName)

                attributes.push(
                  {
                    name: propName,
                    description: propKey,
                  },
                  {
                    name: `:${propName}`,
                    description: propKey,
                  },
                  {
                    name: `v-bind:${propName}`,
                    description: propKey,
                  },
                )
              }
            }

            for (const event of events) {
              const name = hyphenateAttr(event)
              const propKey = parseItemKey('componentEvent', tag, name)

              attributes.push(
                {
                  name: `v-on:${name}`,
                  description: propKey,
                },
                {
                  name: `@${name}`,
                  description: propKey,
                },
              )
            }

            const models: [boolean, string][] = []

            for (const prop of [...props, ...attrs]) {
              if (prop.startsWith('onUpdate:')) {
                const isGlobal = !propsSet.has(prop)
                models.push([isGlobal, prop.substring('onUpdate:'.length)])
              }
            }
            for (const event of events) {
              if (event.startsWith('update:')) {
                models.push([false, event.substring('update:'.length)])
              }
            }

            for (const [isGlobal, model] of models) {
              const name = hyphenateAttr(model)
              const propKey = parseItemKey('componentProp', isGlobal ? '*' : tag, name)

              attributes.push({
                name: `v-model:${name}`,
                description: propKey,
              })

              if (model === 'modelValue') {
                attributes.push({
                  name: 'v-model',
                  description: propKey,
                })
              }
            }

            return attributes
          },
          provideValues: () => [],
        }
      }

      function isSupportedDocument(document: TextDocument) {
        return document.languageId === 'html'
      }

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
        const tagInfos = new Map<string, HtmlTagInfo>()

        let version = { value: 0 }

        updateCustomData([
          newHTMLDataProvider('vine-vue-template-built-in', vueTemplateBuiltinData),
          createVineTemplateDataProvider(
            vineVirtualCode,
            htmlEmbeddedId,
            {
              tagInfos,
              promises,
              version,
            },
          ),
        ])

        return {
          async sync() {
            await Promise.all(promises)
            return version.value
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

function parseItemKey(type: InternalItemId, tag: string, prop: string) {
  return `__VINE_VLS_data=${type},${tag},${prop}`
}
