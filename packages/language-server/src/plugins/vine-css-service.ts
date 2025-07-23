import type { LanguageServicePlugin } from '@volar/language-service'
import type { Provide } from 'volar-service-css'
import type * as css from 'vscode-css-languageservice'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { isRenameEnabled } from '@volar/language-core'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { create as createCssService } from 'volar-service-css'
import { getVueVineVirtualCode } from '../utils'

export function createVineCssService(): LanguageServicePlugin {
  const baseCssService = createCssService({ scssDocumentSelector: ['scss', 'postcss'] })

  return {
    ...baseCssService,
    name: 'vue-vine-css-service',
    create(context) {
      const baseCssServiceInstance = baseCssService.create(context)
      const {
        'css/languageService': getCssLs,
        'css/stylesheet': getStylesheet,
      } = baseCssServiceInstance.provide as Provide

      return {
        ...baseCssServiceInstance,
        async provideDiagnostics(document, token) {
          let diagnostics = await baseCssServiceInstance.provideDiagnostics?.(document, token) ?? []
          if (document.languageId === 'postcss') {
            diagnostics = diagnostics.filter(diag =>
              diag.code !== 'css-semicolonexpected'
              && diag.code !== 'css-ruleorselectorexpected'
              && diag.code !== 'unknownAtRules',
            )
          }
          return diagnostics
        },

        /**
         * If the position is within the virtual code and navigation is enabled,
         * skip the CSS navigation feature to avoid duplicate results.
         */
        provideReferences(document, position) {
          if (isWithinNavigationVirtualCode(document, position)) {
            return
          }
          return worker(document, (stylesheet, cssLs) => {
            return cssLs.findReferences(document, position, stylesheet)
          })
        },
        provideRenameRange(document, position) {
          if (isWithinNavigationVirtualCode(document, position)) {
            return
          }
          return worker(document, (stylesheet, cssLs) => {
            return cssLs.prepareRename(document, position, stylesheet)
          })
        },
      }

      function isWithinNavigationVirtualCode(
        document: TextDocument,
        position: css.Position,
      ) {
        const { vineVirtualCode: root } = getVueVineVirtualCode(document, context)
        if (!isVueVineVirtualCode(root)) {
          return false
        }

        const offset = document.offsetAt(position)
        for (const { sourceOffsets, lengths, data } of root.mappings) {
          if (!sourceOffsets.length || !isRenameEnabled(data)) {
            continue
          }

          const start = sourceOffsets[0]
          const end = sourceOffsets.at(-1)! + lengths.at(-1)!

          if (offset >= start && offset <= end) {
            return true
          }
        }
        return false
      }

      function worker<T>(
        document: TextDocument,
        callback: (stylesheet: css.Stylesheet, cssLs: css.LanguageService) => T,
      ) {
        const cssLs = getCssLs(document)
        if (!cssLs) {
          return
        }
        return callback(getStylesheet(document, cssLs), cssLs)
      }
    },
  }
}
