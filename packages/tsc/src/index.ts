import type { LanguagePlugin } from '@volar/language-core'
import type {
  VueCompilerOptions,
} from '@vue/language-core'
import { runTsc } from '@volar/typescript/lib/quickstart/runTsc'
import {
  createParsedCommandLine,
  createVueLanguagePlugin,
  resolveVueCompilerOptions,
} from '@vue/language-core'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'

const windowsPathReg = /\\/g

export function run() {
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
          vueOptions = createParsedCommandLine(ts, ts.sys, configFilePath.replace(windowsPathReg, '/'), true).vueOptions
        }
        else {
          vueOptions = resolveVueCompilerOptions({})
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
