import {
  createConnection,
  createServer,
  createTypeScriptProjectProviderFactory,
  loadTsdkByPath,
} from '@volar/language-server/node';
import type * as ts from 'typescript';
import { create as createCssService } from 'volar-service-css';
import { create as createEmmetService } from 'volar-service-emmet';
import { create as createHtmlService } from 'volar-service-html';
import { create as createTypeScriptService } from 'volar-service-typescript';

import { VueCompilerOptions, createParsedCommandLine, resolveVueCompilerOptions } from '@vue/language-core';
import { createVueVineLanguagePlugin } from './language-service';

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
    createTypeScriptProjectProviderFactory(
      tsdk.typescript,
      tsdk.diagnosticMessages,
    ),
    {
      getLanguagePlugins(env, projectContext) {
        let compilerOptions: ts.CompilerOptions = {};
        let vueCompilerOptions: VueCompilerOptions;
        if (projectContext.typescript?.configFileName) {
          const { vueOptions, options } = createParsedCommandLine(tsdk.typescript, tsdk.typescript.sys, projectContext.typescript.configFileName);
          vueCompilerOptions = resolveVueCompilerOptions(vueOptions);
          compilerOptions = options;
        }
        else {
          vueCompilerOptions = resolveVueCompilerOptions({});
        }
        return [createVueVineLanguagePlugin(tsdk.typescript, compilerOptions, vueCompilerOptions)]
      },
      getServicePlugins() {
        return [
          createHtmlService(),
          createCssService(),
          createEmmetService(),
          createTypeScriptService(tsdk.typescript),
        ]
      },
    },
  )
})

connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)
