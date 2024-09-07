import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { createVueVineLanguagePlugin, setupGlobalTypes } from '@vue-vine/language-service'
import { createParsedCommandLine, createParsedCommandLineByJson } from '@vue/language-core'
import { posix as path } from 'path';

const windowsPathReg = /\\/g;
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
      const tsconfig = info.project.getProjectName();
      const { vueOptions } = createParsedCommandLine(ts, ts.sys, tsconfig.replace(windowsPathReg, '/'), true);
      vueOptions.__setupedGlobalTypes = setupGlobalTypes(path.dirname(tsconfig.replace(windowsPathReg, '/')), vueOptions, ts.sys);
      return vueOptions;
    }
    else {
      const { vueOptions } = createParsedCommandLineByJson(ts, ts.sys, info.languageServiceHost.getCurrentDirectory(), {}, undefined, true);
      vueOptions.__setupedGlobalTypes = setupGlobalTypes(info.languageServiceHost.getCurrentDirectory(), vueOptions, ts.sys);
      return vueOptions;
    }
  }
})

// @ts-expect-error TypeScript Plugin needs to be exported with `export =`
// eslint-disable-next-line no-restricted-syntax
export = plugin
