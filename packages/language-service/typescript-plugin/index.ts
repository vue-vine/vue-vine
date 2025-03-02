import type { VueCompilerOptions } from '@vue/language-core'
import type { WebSocketServer } from 'ws'
import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { createParsedCommandLine, getDefaultCompilerOptions } from '@vue/language-core'
import { createVueVineLanguagePlugin, setupGlobalTypes } from '../src/index'
import { createVueVinePipelineServer } from './pipeline'

function ensureStrictTemplatesCheck(vueOptions: VueCompilerOptions) {
  vueOptions.checkUnknownComponents = true
  vueOptions.checkUnknownDirectives = true
  vueOptions.checkUnknownEvents = true
  vueOptions.checkUnknownProps = true
}

const logger = {
  info: (...msg: any[]) => {
    console.log(`${new Date().toLocaleString()}: [INFO]`, ...msg)
  },
  error: (...msg: any[]) => {
    console.error(`${new Date().toLocaleString()}: [ERROR]`, ...msg)
  },
}
let pipelineServer: WebSocketServer | undefined

export function createVueVineTypeScriptPlugin() {
  const plugin = createLanguageServicePlugin((ts, info) => {
    const configFileName = info.project.getProjectName()
    const isConfiguredTsProject = info.project.projectKind === ts.server.ProjectKind.Configured
    const vueOptions = (
      isConfiguredTsProject
        ? createParsedCommandLine(ts, ts.sys, configFileName).vueOptions
        : getDefaultCompilerOptions(
            (void 0),
            (void 0),
            true,
          )
    )
    // enable strict templates check by default in Vue Vine
    ensureStrictTemplatesCheck(vueOptions)

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
      setup: (language) => {
        if (isConfiguredTsProject && !pipelineServer) {
          pipelineServer = createVueVinePipelineServer({
            ts,
            language,
            tsPluginInfo: info,
            tsPluginLogger: logger,
          })
          logger?.info(`Pipeline: WebSocket server created`)
        }
      },
    }
  })

  return plugin
}
