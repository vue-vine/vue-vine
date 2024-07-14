import { runTsc } from '@volar/typescript/lib/quickstart/runTsc'
import type { LanguagePlugin } from '@volar/language-core'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'
import {
  FileMap,
  createParsedCommandLine,
  createVueLanguagePlugin,
  resolveVueCompilerOptions,
} from '@vue/language-core'

const removeEmitGlobalTypesRegexp = /^[^\n]*__VLS_globalTypesStart[\s\S]*__VLS_globalTypesEnd[^\n]*\n?$/gm
const windowsPathReg = /\\/g

export function removeEmitGlobalTypes(dts: string) {
  return dts.replace(removeEmitGlobalTypesRegexp, '')
}

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
        const vueOptions = typeof configFilePath === 'string'
          ? createParsedCommandLine(ts, ts.sys, configFilePath.replace(windowsPathReg, '/')).vueOptions
          : resolveVueCompilerOptions({})
        const writeFile = runTscOptions.host!.writeFile.bind(runTscOptions.host)
        runTscOptions.host!.writeFile = (fileName, contents, ...args) => {
          return writeFile(fileName, removeEmitGlobalTypes(contents), ...args)
        }

        languagePlugins.push(
          createVueLanguagePlugin<string>(
            ts,
            id => id,
            () => '',
            (fileName) => {
              const fileMap = new FileMap(runTscOptions.host?.useCaseSensitiveFileNames?.() ?? false)
              const vueFiles = runTscOptions.rootNames.map(rootName => rootName.replace(windowsPathReg, '/'))
              for (const vueFileName of vueFiles) {
                fileMap.set(vueFileName, undefined)
              }
              return fileMap.has(fileName)
            },
            runTscOptions.options,
            vueOptions,
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
