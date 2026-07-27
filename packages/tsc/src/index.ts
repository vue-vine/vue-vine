import type { LanguagePlugin } from '@volar/language-core'
import type { VueCompilerOptions } from '@vue/language-core'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runTsc } from '@volar/typescript/lib/quickstart/runTsc'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'
import {
  createParsedCommandLine,
  createVueLanguagePlugin,
  getDefaultCompilerOptions,
} from '@vue/language-core'

const windowsPathReg = /\\/g

export function run(): void {
  const tscShim = require.resolve('typescript/lib/tsc')
  const typescriptPackagePath = require.resolve('typescript/package.json')
  const typescriptRequire = createRequire(typescriptPackagePath)
  const typescriptPackageName = JSON.parse(
    readFileSync(typescriptPackagePath, 'utf8'),
  ).name
  const tscSdk = typescriptPackageName === '@typescript/typescript6'
    ? typescriptRequire.resolve('@typescript/old/lib/tsc.js')
    : tscShim
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
          // enable strict templates by default
          vueOptions.checkUnknownComponents = true
          vueOptions.checkUnknownDirectives = true
          vueOptions.checkUnknownEvents = true
          vueOptions.checkUnknownProps = true
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
