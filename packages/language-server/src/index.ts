import type { VueCompilerOptions } from '@vue/language-core'
import type * as ts from 'typescript'
import path from 'node:path'
import {
  createConnection,
  createServer,
  createTypeScriptProject,
  loadTsdkByPath,
} from '@volar/language-server/node'
import { createVueVineLanguagePlugin, setupGlobalTypes } from '@vue-vine/language-service'
import { getDefaultCompilerOptions } from '@vue/language-core'
import { create as createCssService } from 'volar-service-css'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { createVineDiagnosticsPlugin } from './plugins/vine-diagnostics'
import { createDocumentHighlightForward } from './plugins/vine-document-highlight'
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
  const project = createTypeScriptProject(
    tsdk.typescript,
    tsdk.diagnosticMessages,
    ({ configFileName }) => ({
      languagePlugins: getLanguagePlugins(configFileName),
      setup() {},
    }),
  )

  const plugins = [
    createCssService(),
    createEmmetService(),
    // Vine plugins:
    createVineDiagnosticsPlugin(),
    createVineFoldingRangesPlugin(
      createTypeScriptServices(tsdk.typescript)
        .find(plugin => plugin.name === 'typescript-syntactic'),
    ),
    createDocumentHighlightForward(),
    // HTML Service is included here ↓
    createVineTemplatePlugin(),
  ]

  const result = await server.initialize(
    params,
    project,
    plugins,
  )

  // tsserver already provides semantic tokens
  // TODO: handle in upstream instead of here
  result.capabilities.semanticTokensProvider = undefined

  return result

  function getLanguagePlugins(configFileName: string | undefined) {
    const compilerOptions: ts.CompilerOptions = {}
    const vueCompilerOptions: VueCompilerOptions = getDefaultCompilerOptions(
      (void 0),
      (void 0),
      true, // enable strict templates by default
    )

    if (configFileName) {
      const vineGlobalTypesPath = setupGlobalTypes(
        path.dirname(configFileName),
        vueCompilerOptions,
        tsdk.typescript.sys,
      )
      if (vineGlobalTypesPath) {
        vueCompilerOptions.__setupedGlobalTypes = vineGlobalTypesPath
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
