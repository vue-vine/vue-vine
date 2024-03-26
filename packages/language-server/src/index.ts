import {
  createConnection,
  createServer,
  createSimpleProjectProviderFactory,
  createTypeScriptProjectProviderFactory,
  loadTsdkByPath,
} from '@volar/language-server/node'
import type * as ts from 'typescript'
import { create as createCssService } from 'volar-service-css'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createHtmlService } from 'volar-service-html'
import { create as createTypeScriptServices } from 'volar-service-typescript'

import type { VueCompilerOptions } from '@vue/language-core'
import { createParsedCommandLine, resolveVueCompilerOptions } from '@vue/language-core'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'

const debug = false

const connection = createConnection()
const server = createServer(connection)

connection.listen()

connection.onInitialize((params) => {
  const tsdk = loadTsdkByPath(
    params.initializationOptions.typescript.tsdk,
    params.locale,
  )

  return server.initialize(
    params,
    debug
      ? createTypeScriptProjectProviderFactory(
        tsdk.typescript,
        tsdk.diagnosticMessages,
      )
      : createSimpleProjectProviderFactory(),
    {
      getLanguagePlugins(env, projectContext) {
        let compilerOptions: ts.CompilerOptions = {}
        let vueCompilerOptions: VueCompilerOptions
        if (projectContext.typescript?.configFileName) {
          const { vueOptions, options } = createParsedCommandLine(tsdk.typescript, tsdk.typescript.sys, projectContext.typescript.configFileName)
          vueCompilerOptions = resolveVueCompilerOptions(vueOptions)
          compilerOptions = options
        }
        else {
          vueCompilerOptions = resolveVueCompilerOptions({})
        }
        return [createVueVineLanguagePlugin(tsdk.typescript, compilerOptions, vueCompilerOptions)]
      },
      getServicePlugins() {
        const plugins = [
          createHtmlService(),
          createCssService(),
          createEmmetService(),
        ]
        if (debug) {
          plugins.push(...createTypeScriptServices(tsdk.typescript))
        }
        return plugins;
      },
    },
  )
})

connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)
