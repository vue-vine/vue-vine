import type { VueCompilerOptions } from '@vue/language-core'
import type * as ts from 'typescript'
import path from 'node:path'
import {
  createConnection,
  createServer,
  createTypeScriptProject,
  loadTsdkByPath,
} from '@volar/language-server/node'
import { resolveVueCompilerOptions } from '@vue/language-core'
import { createVueVineLanguagePlugin, setupGlobalTypes } from '@vue-vine/language-service'
import { create as createCssService } from 'volar-service-css'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { createVineDiagnosticsPlugin } from './plugins/vine-diagnostics'
import { createVineFoldingRangesPlugin } from './plugins/vine-folding-ranges'
import { createVineTemplatePlugin } from './plugins/vine-template'

const connection = createConnection()
const server = createServer(connection)

connection.listen()

connection.onInitialize(async (params) => {
  const tsdk = loadTsdkByPath(
    params.initializationOptions.typescript.tsdk,
    params.locale,
  )
  const plugins = [
    createCssService(),
    createEmmetService(),
    // Vine plugins:
    createVineDiagnosticsPlugin(),
    createVineFoldingRangesPlugin(),
    // HTML Service is included here ↓
    createVineTemplatePlugin(),
  ]
  plugins.push(
    ...createTypeScriptServices(tsdk.typescript)
      .filter(plugin => plugin.name === 'typescript-syntactic'),
  )

  const result = await server.initialize(
    params,
    createTypeScriptProject(
      tsdk.typescript,
      tsdk.diagnosticMessages,
      ({ configFileName }) => ({
        languagePlugins: getLanguagePlugins(configFileName),
        setup() { },
      }),
    ),
    plugins,
  )

  // tsserver already provides semantic tokens
  // TODO: handle in upstream instead of here
  result.capabilities.semanticTokensProvider = undefined

  return result

  function getLanguagePlugins(configFileName: string | undefined) {
    const compilerOptions: ts.CompilerOptions = {}
    const vueCompilerOptions: VueCompilerOptions = resolveVueCompilerOptions({
      // enable strict templates by default
      strictTemplates: true,
    })

    if (configFileName) {
      const vineGlobalTypesPath = setupGlobalTypes(
        path.dirname(configFileName),
        vueCompilerOptions,
        tsdk.typescript.sys,
      )
      if (vineGlobalTypesPath) {
        vueCompilerOptions.__setupedGlobalTypes = {
          absolutePath: vineGlobalTypesPath,
        }
      }
    }

    return [
      createVueVineLanguagePlugin(
        tsdk.typescript,
        {
          compilerOptions,
          vueCompilerOptions,
          target: 'extension',
        },
      ),
    ]
  }
})

connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)
