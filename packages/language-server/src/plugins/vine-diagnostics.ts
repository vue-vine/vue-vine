import type { LanguageServicePlugin } from '@volar/language-service'
import type { Diagnostic } from '@volar/language-server/node'
import { URI } from 'vscode-uri'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { VLS_InfoLog, transformVineDiagnostic } from '../../../language-service/src/shared'

const NOT_SHOW_VUE_VINE_MSG_TAG = [
  'volar-embedded-content',
  'volar_virtual_code',
]

function toLogInfo(diagnostic: Diagnostic) {
  const startLocation = `${diagnostic.range.start.line}:${diagnostic.range.start.character}`
  const endLocation = `${diagnostic.range.end.line}:${diagnostic.range.end.character}`

  return {
    msg: diagnostic.message,
    start: startLocation,
    end: endLocation,
  }
}

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

          VLS_InfoLog(
            '[VueVineDiagnosticsProvider]',
            `results: `,
            {
              docUri: docUri.toString(),
              virtualCode: virtualCode?.id,
              diagnostics: results.map(toLogInfo),
            },
          )

          return results
        },
      }
    },
  }
}
