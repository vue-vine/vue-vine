import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { createParsedCommandLine, resolveVueCompilerOptions } from '@vue/language-core'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'

const windowsPathReg = /\\/g
const plugin = createLanguageServicePlugin((ts, info) => {
  return {
    languagePlugins: [
      createVueVineLanguagePlugin(
        ts,
        {
          compilerOptions: info.languageServiceHost.getCompilationSettings(),
          vueCompilerOptions: getVueCompilerOptions(),
          target: 'extension',
        },
      ),
    ],
  }

  function getVueCompilerOptions() {
    if (info.project.projectKind === ts.server.ProjectKind.Configured) {
      const tsconfig = info.project.getProjectName()
      const { vueOptions } = createParsedCommandLine(ts, ts.sys, tsconfig.replace(windowsPathReg, '/'), true)
      return vueOptions
    }
    else {
      const vueOptions = resolveVueCompilerOptions({})
      return vueOptions
    }
  }
})

// @ts-expect-error TypeScript Plugin needs to be exported with `export =`
// eslint-disable-next-line no-restricted-syntax
export = plugin
