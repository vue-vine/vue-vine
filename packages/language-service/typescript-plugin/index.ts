import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { resolveVueCompilerOptions } from '@vue/language-core'
import { createVueVineLanguagePlugin } from '../src/index'
import { proxyLanguageServiceForVueVine } from './common'
import { startNamedPipeServer } from './server'

export function createVueVineTypeScriptPlugin() {
  const plugin = createLanguageServicePlugin((ts, info) => {
    const vueOptions = resolveVueCompilerOptions({})
    const vueVinePlugin = createVueVineLanguagePlugin(
      ts,
      {
        compilerOptions: info.languageServiceHost.getCompilationSettings(),
        vueCompilerOptions: vueOptions,
        target: 'extension',
      },
    )

    return {
      languagePlugins: [vueVinePlugin],
      setup: (language) => {
        info.languageService = proxyLanguageServiceForVueVine(
          ts,
          language,
          info.languageService,
          vueOptions,
          fileName => fileName,
        )
        if (
          info.project.projectKind === ts.server.ProjectKind.Configured
          || info.project.projectKind === ts.server.ProjectKind.Inferred
        ) {
          startNamedPipeServer(ts, info, language, info.project.projectKind)
        }
      },
    }
  })

  return plugin
}
