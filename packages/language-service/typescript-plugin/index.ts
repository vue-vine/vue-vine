import type { VueCompilerOptions } from '@vue/language-core'
import type * as ts from 'typescript'
import type { WebSocketServer } from 'ws'
import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { createParsedCommandLine, getDefaultCompilerOptions } from '@vue/language-core'
import { createVueVineLanguagePlugin, setupGlobalTypes } from '../src/index'
import { createVueVinePipelineServer } from './pipeline'
import { allocatePort } from './port-manager'
import { proxyLanguageServiceForVine } from './proxy-ts-lang-service'

function ensureStrictTemplatesCheck(vueOptions: VueCompilerOptions) {
  vueOptions.checkUnknownComponents = true
  vueOptions.checkUnknownDirectives = true
  vueOptions.checkUnknownEvents = true
  vueOptions.checkUnknownProps = true
}

interface PipelineServerInstance {
  server: WebSocketServer
  cleanup: () => void
}

let pipelineServerInstance: PipelineServerInstance | undefined

/**
 * Initialize the pipeline server with robust error handling and retry logic
 */
async function initializePipelineServer(
  ts: typeof import('typescript'),
  info: ts.server.PluginCreateInfo,
  language: any,
): Promise<void> {
  const configFileName = info.project.getProjectName()

  // Prevent multiple initializations
  if (pipelineServerInstance) {
    return
  }

  try {
    let serverInstance: WebSocketServer | undefined

    const result = await allocatePort(
      {
        host: ts.sys,
        tsConfigFilePath: configFileName,
        projectPath: configFileName,
      },
      async (port) => {
        // Create server factory function
        const server = createVueVinePipelineServer(port, {
          ts,
          language,
          tsPluginInfo: info,
        })

        serverInstance = server
        return server
      },
    )

    // Store the server instance with cleanup function
    if (serverInstance) {
      pipelineServerInstance = {
        server: serverInstance,
        cleanup: () => {
          result.cleanup()
          serverInstance?.close()
        },
      }
    }

    console.info(`Pipeline: Server successfully started on port ${result.port}`)
  }
  catch (err) {
    console.error(
      'Pipeline: Failed to initialize server. Pipeline features will be disabled.',
      err,
    )
    // Don't throw - allow plugin to continue without pipeline server
  }
}

/**
 * Cleanup pipeline server resources
 */
function cleanupPipelineServer(): void {
  if (pipelineServerInstance) {
    try {
      pipelineServerInstance.cleanup()
      console.info('Pipeline: Server cleaned up successfully')
    }
    catch (err) {
      console.error('Pipeline: Error during cleanup', err)
    }
    finally {
      pipelineServerInstance = undefined
    }
  }
}

export interface VueVineTypeScriptPluginOptions {
  enablePipelineServer?: boolean
}
export function createVueVineTypeScriptPlugin(options: VueVineTypeScriptPluginOptions = {}): ts.server.PluginModuleFactory {
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
      vueOptions.globalTypesPath = setupGlobalTypes(
        vueOptions,
        ts.sys,
      )
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
        // Initialize pipeline server if enabled
        if (
          enablePipelineServer
          && isConfiguredTsProject
        ) {
          initializePipelineServer(ts, info, language).catch((err) => {
            console.error('Pipeline: Unhandled error during initialization', err)
          })
        }

        // Setup proxy for language service
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

// Export cleanup function for testing and manual cleanup
export { cleanupPipelineServer }
