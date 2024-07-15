import type { LanguageServicePlugin } from '@volar/language-service'
import type { Diagnostic } from '@volar/language-server/node'
import { URI } from 'vscode-uri'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { transformVineDiagnostic } from '../../../language-service/src/shared'

const NOT_SHOW_VUE_VINE_MSG_TAG = [
  'volar_virtual_code',
]

export function createVineDiagnostics(): LanguageServicePlugin {
  return {
    name: 'Vue Vine Diagnostics Provider',
    capabilities: {
      diagnosticProvider: {},
    },
    create(context) {
      return {
        provideDiagnostics(document) {
          const diagnostics: Diagnostic[] = []
          const docUri = URI.parse(document.uri)
          const isNoNeedDiagnostics = NOT_SHOW_VUE_VINE_MSG_TAG.some(
            tag => docUri.toString().includes(tag),
          )
          if (isNoNeedDiagnostics) {
            return diagnostics
          }

          const decoded = context.decodeEmbeddedDocumentUri(docUri)
          if (!decoded) {
            // Not a embedded document
            return diagnostics
          }
          const virtualCode = context.language.scripts
            .get(decoded[0])?.generated?.embeddedCodes
            .get(decoded[1])
          if (!virtualCode || !isVueVineVirtualCode(virtualCode)) {
            return
          }

          const results = diagnostics.concat([
            ...virtualCode.vineMetaCtx?.vineCompileErrs?.map(err => transformVineDiagnostic(err, 'err')) ?? [],
            ...virtualCode.vineMetaCtx?.vineCompileWarns?.map(warn => transformVineDiagnostic(warn, 'warn')) ?? [],
          ])

          return results
        },
      }
    },
  }
}
