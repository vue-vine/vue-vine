import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'
import { resolveVueCompilerOptions } from '@vue/language-core'

const plugin = createLanguageServicePlugin((ts, info) => {
  return {
    languagePlugins: [
      createVueVineLanguagePlugin(
        ts,
        {
          compilerOptions: info.languageServiceHost.getCompilationSettings(),
          vueCompilerOptions: resolveVueCompilerOptions({}),
          target: 'extension',
        },
      ),
    ],
  }
})

// @ts-expect-error TypeScript Plugin needs to be exported with `export =`
// eslint-disable-next-line no-restricted-syntax
export = plugin
