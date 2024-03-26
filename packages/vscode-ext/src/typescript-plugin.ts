import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'
import { resolveVueCompilerOptions } from '@vue/language-core'

const plugin = createLanguageServicePlugin((ts) => {
  return [
    createVueVineLanguagePlugin(
      ts,
      { /* ts.CompilerOptions */ },
      resolveVueCompilerOptions({}),
    ),
  ]
})

// @ts-expect-error
export = plugin;
