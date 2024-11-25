import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { createParsedCommandLine, resolveVueCompilerOptions } from '@vue/language-core'
import { createVueVineLanguagePlugin, setupGlobalTypes } from '../src/index'

export function createVueVineTypeScriptPlugin() {
  const plugin = createLanguageServicePlugin((ts, info) => {
    const configFileName = info.project.getProjectName()
    const isConfiguredTsProject = info.project.projectKind === ts.server.ProjectKind.Configured
    const vueOptions = (
      isConfiguredTsProject
        ? createParsedCommandLine(ts, ts.sys, configFileName).vueOptions
        : resolveVueCompilerOptions({
          // enable strict templates by default
          strictTemplates: true,
        })
    )

    if (isConfiguredTsProject) {
      const globalTypesFilePath = setupGlobalTypes(
        info.project.getProjectName(),
        vueOptions,
        ts.sys,
      )
      if (globalTypesFilePath) {
        vueOptions.__setupedGlobalTypes = {
          absolutePath: globalTypesFilePath,
        }
      }
    }

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
