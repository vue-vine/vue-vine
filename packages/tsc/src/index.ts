import type { LanguagePlugin } from '@volar/language-core'
import type {
  VueCompilerOptions,
} from '@vue/language-core'
import { runTsc } from '@volar/typescript/lib/quickstart/runTsc'
import { createVueVineLanguagePlugin, setupGlobalTypes } from '@vue-vine/language-service'
import {
  createParsedCommandLine,
  createVueLanguagePlugin,
  getDefaultCompilerOptions,
} from '@vue/language-core'

const windowsPathReg = /\\/g

export function run(): void {
  const tscSdk = require.resolve('typescript/lib/tsc')
  const main = () => {
    // Type check for `.vine.ts` files
    runTsc(
      tscSdk,
      ['.vine.ts', '.vue'],
      (ts, runTscOptions) => {
        const languagePlugins: LanguagePlugin[] = []
        const { configFilePath } = runTscOptions.options
        let vueOptions: VueCompilerOptions
        if (typeof configFilePath === 'string') {
          vueOptions = createParsedCommandLine(ts, ts.sys, configFilePath.replace(windowsPathReg, '/')).vueOptions
          vueOptions.globalTypesPath = setupGlobalTypes(
            vueOptions,
            ts.sys,
          )
        }
        else {
          vueOptions = getDefaultCompilerOptions(
            (void 0),
            (void 0),
            true,
          )
        }

        languagePlugins.push(
          createVueLanguagePlugin<string>(
            ts,
            runTscOptions.options,
            vueOptions,
            id => id,
          ),
        )

        languagePlugins.push(
          createVueVineLanguagePlugin(
            ts,
            {
              compilerOptions: runTscOptions.options,
              vueCompilerOptions: vueOptions,
              target: 'tsc',
            },
          ),
        )

        return {
          languagePlugins,
        }
      },
    )
  }

  try {
    main()
  }
  catch (err) {
    console.error('[vue-vine-tsc]', err)
  }
}
