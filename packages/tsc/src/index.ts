import { runTsc } from '@volar/typescript/lib/quickstart/runTsc'
import type { LanguagePlugin } from '@volar/language-core'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'
import { resolveVueCompilerOptions } from '@vue/language-core'

const removeEmitGlobalTypesRegexp = /^[^\n]*__VLS_globalTypesStart[\s\S]*__VLS_globalTypesEnd[^\n]*\n?$/gm

export function removeEmitGlobalTypes(dts: string) {
  return dts.replace(removeEmitGlobalTypesRegexp, '')
}

export function run() {
  const runExtensions = ['.vine.ts']
  const tscSdk = require.resolve('typescript/lib/tsc')
  const main = () => runTsc(
    tscSdk,
    runExtensions,
    (ts, runTscOptions) => {
      const languagePlugins: LanguagePlugin[] = []

      languagePlugins.push(
        createVueVineLanguagePlugin(
          ts,
          {
            compilerOptions: runTscOptions.options,
            vueCompilerOptions: resolveVueCompilerOptions({}),
            target: 'tsc',
          },
        ),
      )

      return {
        languagePlugins,
      }
    },
  )

  try {
    main()
  }
  catch (err) {
    console.error('[vue-vine-tsc]', err)
  }
}
