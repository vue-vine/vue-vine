import createEmmetService from 'volar-service-emmet'
import createHtmlService from 'volar-service-html'
import createCssService from 'volar-service-css'
import createTsService from 'volar-service-typescript'
import type { Diagnostic, LanguageServerPlugin, Service } from '@volar/language-server/node'
import { createConnection, startLanguageServer } from '@volar/language-server/node'
import { VineFile, createLanguage } from './language'
import { transformVineDiagnostic } from './utils'

const plugin: LanguageServerPlugin = (_, modules): ReturnType<LanguageServerPlugin> => ({
  extraFileExtensions: [],
  resolveConfig(config) {
    // languages
    config.languages ??= {}
    config.languages.typescript ??= createLanguage(modules.typescript!)

    // services
    config.services ??= {}
    config.services.html ??= createHtmlService()
    config.services.css ??= createCssService()
    config.services.emmet ??= createEmmetService()
    config.services.typescript ??= createTsService()
    config.services.vine ??= (context): ReturnType<Service> => ({
      provideDiagnostics(document) {
        const [file] = context!.documents.getVirtualFileByUri(document.uri)
        if (!(file instanceof VineFile))
          return

        const diagnostics: Diagnostic[] = []
        for (const err of file.vineCompileErrs) {
          diagnostics.push(transformVineDiagnostic(err, 'err'))
        }
        for (const warn of file.vineCompileWarns) {
          diagnostics.push(transformVineDiagnostic(warn, 'warn'))
        }

        return diagnostics
      },
    })

    return config
  },
})

startLanguageServer(
  createConnection(),
  plugin,
)
