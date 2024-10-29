import type { Diagnostic } from '@volar/language-server/node'
import type { LanguageServicePlugin } from '@volar/language-service'
import type { VineDiagnostic } from '@vue-vine/compiler'
import { isVueVineVirtualCode, transformVineDiagnostic, VLS_InfoLog } from '@vue-vine/language-service'
import { URI } from 'vscode-uri'

const NOT_SHOW_VUE_VINE_MSG_TAG = [
  'volar_virtual_code',
]

function showLogForVineDiagnostics(diags: VineDiagnostic[]) {
  const debugDiagnostic = ({ msg, location }: VineDiagnostic) => JSON.stringify({ msg, location }, null, 2)
  VLS_InfoLog('vineErrs: \n' + `${
    diags.length > 0
      ? diags.map(debugDiagnostic).join('\n')
      : '[ Empty ]'
  }\n`)
}

export function createVineDiagnostics(): LanguageServicePlugin {
  return {
    name: 'Vue Vine Diagnostics Provider',
    capabilities: {
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
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
          const [sourceScriptId, embeddedCodeId] = decoded
          const sourceScript = context.language.scripts.get(sourceScriptId)
          const virtualCode = sourceScript?.generated?.embeddedCodes?.get(embeddedCodeId)
          if (!virtualCode || !isVueVineVirtualCode(virtualCode)) {
            return
          }

          const vineErrs = virtualCode.vineMetaCtx?.vineCompileErrs ?? []
          const vineWarns = virtualCode.vineMetaCtx?.vineCompileWarns ?? []

          showLogForVineDiagnostics(vineErrs)
          showLogForVineDiagnostics(vineWarns)

          const results = diagnostics.concat([
            ...vineErrs.map(err => transformVineDiagnostic(err, 'err')),
            ...vineWarns.map(warn => transformVineDiagnostic(warn, 'warn')),
          ])

          return results
        },
      }
    },
  }
}
