import type { VueCompilerOptions } from '@vue/language-core'
import type * as ts from 'typescript'
import type { WebSocketServer } from 'ws'
import { dirname, posix as path } from 'node:path'
import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { createParsedCommandLine, getDefaultCompilerOptions } from '@vue/language-core'
import { detect } from 'detect-port'
import { createVueVineLanguagePlugin, setupGlobalTypes } from '../src/index'
import { createVueVinePipelineServer } from './pipeline'
import { proxyLanguageServiceForVine } from './proxy-ts-lang-service'

function ensureStrictTemplatesCheck(vueOptions: VueCompilerOptions) {
  vueOptions.checkUnknownComponents = true
  vueOptions.checkUnknownDirectives = true
  vueOptions.checkUnknownEvents = true
  vueOptions.checkUnknownProps = true
}

const DEFAULT_PIPELINE_PORT = 15193
const logger = {
  info: (...msg: any[]) => {
    console.log(`${new Date().toLocaleString()}: [INFO]`, ...msg)
  },
  error: (...msg: any[]) => {
    console.error(`${new Date().toLocaleString()}: [ERROR]`, ...msg)
  },
}

let pipelineServer: WebSocketServer | undefined

export interface VueVineTypeScriptPluginOptions {
  enablePipelineServer?: boolean
}
export function createVueVineTypeScriptPlugin(options: VueVineTypeScriptPluginOptions = {}) {
  const {
    enablePipelineServer = true,
  } = options

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
        configFileName,
        vueOptions,
        ts.sys,
      )
      if (globalTypesFilePath) {
        vueOptions.__setupedGlobalTypes = globalTypesFilePath
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
        if (
          enablePipelineServer
          && isConfiguredTsProject
          && !pipelineServer
        ) {
          detect(DEFAULT_PIPELINE_PORT)
            .then((availablePort) => {
              if (pipelineServer) {
                return
              }

              pipelineServer = createVueVinePipelineServer(availablePort, {
                ts,
                language,
                languageService: info.languageService,
                tsPluginInfo: info,
                tsPluginLogger: logger,
              })
              logger?.info(`Pipeline: WebSocket server created`)

              writePipelineServerPortToFile(
                ts.sys,
                configFileName,
                availablePort,
              )
            })
            .catch((err) => {
              logger?.error(
                `Pipeline: Failed to detect available port for pipeline server`,
                err,
              )
            })
        }

        info.languageService = proxyLanguageServiceForVine(
          ts,
          language,
          info.languageService,
        )
      },
    }
  })

  return plugin
}

function writePipelineServerPortToFile(
  host: ts.System,
  tsConfigFilePath: string,
  port: number,
) {
  const rootDir = dirname(tsConfigFilePath)

  // Find the `node_modules` directory that contains `vue-vine`
  let dir = rootDir
  while (!host.fileExists(path.join(dir, 'node_modules', 'vue-vine', 'package.json'))) {
    const parentDir = dirname(dir)
    if (parentDir === dir) {
      throw new Error('Failed to find `node_modules` directory that contains \'vue-vine\'')
    }
    dir = parentDir
  }

  host.writeFile(
    path.join(dir, 'node_modules', '.vine-pipeline-port'),
    port.toString(),
  )
}
