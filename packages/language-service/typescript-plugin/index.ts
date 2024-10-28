import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { resolveVueCompilerOptions } from '@vue/language-core'
import { createVueVineLanguagePlugin } from '../src/index'

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
    }
  })

  return plugin
}
