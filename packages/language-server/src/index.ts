import type * as ts from 'typescript'
import {
  createConnection,
  createServer,
  createTypeScriptProject,
  loadTsdkByPath,
} from '@volar/language-server/node'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { createTsServerRequestForwardingPipeline } from './pipeline'
import { createVineCssService } from './plugins/vine-css-service'
import { createVineDiagnosticsPlugin } from './plugins/vine-diagnostics'
import { createDocumentHighlightForward } from './plugins/vine-document-highlight'
import { createVineFoldingRangesPlugin } from './plugins/vine-folding-ranges'
import { createVineTemplatePlugin } from './plugins/vine-template'
import { getDefaultVueCompilerOptions } from './utils'

const connection = createConnection()
const server = createServer(connection)
const pipeline = createTsServerRequestForwardingPipeline(connection)

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
    createVineCssService(),
    createEmmetService(),
    // Vine plugins:
    createVineDiagnosticsPlugin(),
    createVineFoldingRangesPlugin(
      createTypeScriptServices(tsdk.typescript)
        .find(plugin => plugin.name === 'typescript-syntactic'),
    ),
    createDocumentHighlightForward(pipeline),
    // HTML Service is included here ↓
    createVineTemplatePlugin(pipeline),
  ]

  const result = await server.initialize(
    params,
    project,
    plugins,
  )

  // tsserver already provides semantic tokens
  // Todo: handle in upstream instead of here
  result.capabilities.semanticTokensProvider = undefined

  return result

  function getLanguagePlugins(_configFileName: string | undefined) {
    const compilerOptions: ts.CompilerOptions = {}
    const vueCompilerOptions = getDefaultVueCompilerOptions(tsdk.typescript.sys)

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
