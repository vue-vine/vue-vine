import createEmmetService from 'volar-service-emmet'
import createHtmlService from 'volar-service-html'
import createCssService from 'volar-service-css'
import type { Diagnostic, LanguageServerPlugin, Service } from '@volar/language-server/node'
import { DiagnosticSeverity, createConnection, startLanguageServer } from '@volar/language-server/node'
import { VineFile, language } from './language'

const plugin: LanguageServerPlugin = (): ReturnType<LanguageServerPlugin> => ({
  extraFileExtensions: [{ extension: '.vine.ts', isMixedContent: true, scriptKind: 7 }],
  resolveConfig(config) {
    // languages
    config.languages ??= {}
    config.languages.typescript ??= language

    // services
    config.services ??= {}
    config.services.html ??= createHtmlService()
    config.services.css ??= createCssService()
    config.services.emmet ??= createEmmetService()
    config.services.typescript ??= (context): ReturnType<Service> => ({
      provideDiagnostics(document) {
        const [file] = context!.documents.getVirtualFileByUri(document.uri)
        if (!(file instanceof VineFile))
          return

        const errors: Diagnostic[] = []
        for (const err of file.vineCompileErrs) {
          errors.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: file.textDocument.positionAt(err.range?.start.index ?? 0),
              end: file.textDocument.positionAt(err.range?.end.index ?? 0),
            },
            source: 'vue-vine',
            message: err.msg,
          })
        }
        return errors
      },
    })

    return config
  },
})

startLanguageServer(
  createConnection(),
  plugin,
)
