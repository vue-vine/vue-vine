import type {
  LanguageServer,
  LanguageServerProject,
} from '@volar/language-server/node'
import type { LanguageService } from '@volar/language-service'
import type { PipelineResponseInstance } from '@vue-vine/language-service'
import type * as ts from 'typescript'
import {
  createConnection,
  createLanguageServiceEnvironment,
  createServer,
  loadTsdkByPath,
} from '@volar/language-server/node'
import { createLanguage, createLanguageService, createUriMap } from '@volar/language-service'
import { createVueVineLanguagePlugin } from '@vue-vine/language-service'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { URI } from 'vscode-uri'
import { createTsServerRequestForwardingPipeline } from './pipeline'
import { sendTsServerRequest } from './pipeline/shared'
import { createVineCssService } from './plugins/vine-css-service'
import { createVineDiagnosticsPlugin } from './plugins/vine-diagnostics'
import { createDocumentHighlightForward } from './plugins/vine-document-highlight'
import { createVineFoldingRangesPlugin } from './plugins/vine-folding-ranges'
import { createVineTemplatePlugin } from './plugins/vine-template'
import { getDefaultVueCompilerOptions } from './utils'

export function startServer(): void {
  const connection = createConnection()
  const server = createServer(connection)
  const pipeline = createTsServerRequestForwardingPipeline(connection)

  connection.listen()
  connection.onInitialize(async (params) => {
    const tsdk = loadTsdkByPath(
      params.initializationOptions.typescript.tsdk,
      params.locale,
    )
    const tsconfigProjects = createUriMap<LanguageService>()
    const file2ProjectInfo = new Map<string, Promise<PipelineResponseInstance<'projectInfoResponse'> | null>>()

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

    let simpleLanguageService: LanguageService | undefined

    const tsProjectProxy: LanguageServerProject = {
      setup() { /* ...Nothing for here */ },
      async getLanguageService(uri) {
        if (uri.scheme === 'file') {
          const fileName = uri.fsPath.replace(/\\/g, '/')
          let projectInfoPromise = file2ProjectInfo.get(fileName)
          if (!projectInfoPromise) {
            projectInfoPromise = sendTsServerRequest<'projectInfoRequest'>(
              connection,
              'projectInfo',
              { file: fileName, needFileNameList: false },
            )

            file2ProjectInfo.set(fileName, projectInfoPromise)
          }
          const projectInfo = await projectInfoPromise
          if (projectInfo?.result) {
            const { configFileName } = projectInfo.result
            let languageService = tsconfigProjects.get(URI.file(configFileName))
            if (!languageService) {
              languageService = createProjectLanguageService(server)
              tsconfigProjects.set(URI.file(configFileName), languageService)
            }
            return languageService
          }
        }
        return simpleLanguageService ??= createProjectLanguageService(server)
      },
      getExistingLanguageServices() {
        return Promise.all([
          ...tsconfigProjects.values(),
          simpleLanguageService,
        ].filter(promise => !!promise))
      },
      reload() {
        for (const languageService of tsconfigProjects.values()) {
          languageService.dispose()
        }
        tsconfigProjects.clear()
        if (simpleLanguageService) {
          simpleLanguageService.dispose()
          simpleLanguageService = undefined
        }
      },
    }

    const result = server.initialize(
      params,
      tsProjectProxy,
      plugins,
    )

    // tsserver already provides semantic tokens
    // Todo: handle in upstream instead of here
    result.capabilities.semanticTokensProvider = undefined

    return result

    function getLanguagePlugins() {
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
    function createProjectLanguageService(server: LanguageServer) {
      const language = createLanguage<URI>(
        [
          { getLanguageId: uri => server.documents.get(uri)?.languageId },
          ...getLanguagePlugins(),
        ],
        createUriMap(),
        (uri) => {
          const document = server.documents.get(uri)
          if (document) {
            language.scripts.set(uri, document.getSnapshot(), document.languageId)
          }
          else {
            language.scripts.delete(uri)
          }
        },
      )
      return createLanguageService(
        language,
        server.languageServicePlugins,
        createLanguageServiceEnvironment(server, [...server.workspaceFolders.all]),
        {},
      )
    }
  })

  connection.onInitialized(server.initialized)
  connection.onShutdown(server.shutdown)
}
