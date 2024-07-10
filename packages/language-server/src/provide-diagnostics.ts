import type { LanguageServicePlugin } from '@volar/language-service'
import type { Diagnostic } from '@volar/language-server/node'
import { URI } from 'vscode-uri'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { transformVineDiagnostic } from '../../language-service/src/shared'

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
          const decoded = context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
          if (!decoded) {
            // Not a embedded document
            return
          }
          const virtualCode = context.language.scripts
            .get(decoded[0])?.generated?.embeddedCodes
            .get(decoded[1])

          if (!virtualCode || !isVueVineVirtualCode(virtualCode)) {
            return
          }

          return diagnostics.concat([
            ...virtualCode.vineCompileErrs.map(err => transformVineDiagnostic(err, 'err')),
            ...virtualCode.vineCompileWarns.map(warn => transformVineDiagnostic(warn, 'warn')),
          ])
        },
      }
    },
  }
}
