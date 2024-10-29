import type { Diagnostic } from '@volar/language-server/node'
import type { LanguageServicePlugin, Mapper } from '@volar/language-service'
import type { VineDiagnostic } from '@vue-vine/compiler'
import type { TextDocument } from 'vscode-html-languageservice'
import {
  isVueVineVirtualCode,
} from '@vue-vine/language-service'
import { URI } from 'vscode-uri'
import { HIDE_VUE_VINE_DIAGNOSTICS_TAG } from '../constants'

const isTemplateDiagnostic = (vineDiag: VineDiagnostic) => vineDiag.rawVueTemplateLocation != null

function transformVineDiagnostic(
  document: TextDocument,
  mapper: Mapper,
  diag: VineDiagnostic,
  type: 'err' | 'warn',
): Diagnostic {
  let start = 0
  let end = 0

  // `toSourceLocation` is a generator so we need to iterate it to get the first value
  ;[start] = mapper.toGeneratedLocation(diag.location?.start.index ?? 0).next().value ?? []
  ;[end] = mapper.toGeneratedLocation(diag.location?.end.index ?? 0).next().value ?? []

  return {
    severity: type === 'err' ? 1 : 2,
    source: 'vue-vine',
    message: diag.msg,
    range: {
      start: document.positionAt(start ?? 0),
      end: document.positionAt(end ?? 0),
    },
  }
}

export function createVineDiagnosticsPlugin(): LanguageServicePlugin {
  return {
    name: 'vue-vine-diagnostics',
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
          const isNoNeedDiagnostics = HIDE_VUE_VINE_DIAGNOSTICS_TAG.some(
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
          if (!sourceScript || !virtualCode || !isVueVineVirtualCode(virtualCode)) {
            return
          }

          const vineErrs = virtualCode.vineMetaCtx?.vineCompileErrs ?? []
          const vineWarns = virtualCode.vineMetaCtx?.vineCompileWarns ?? []

          const mapper = context.language.maps.get(
            virtualCode,
            sourceScript,
          )

          const results = diagnostics.concat([
            ...vineErrs
              .filter(diag => !isTemplateDiagnostic(diag))
              .map(err => transformVineDiagnostic(document, mapper, err, 'err')),
            ...vineWarns
              .filter(diag => !isTemplateDiagnostic(diag))
              .map(warn => transformVineDiagnostic(document, mapper, warn, 'warn')),
          ])

          return results
        },
      }
    },
  }
}
