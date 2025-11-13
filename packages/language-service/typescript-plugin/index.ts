import type { Language } from '@volar/language-core'
import type { VueCompilerOptions } from '@vue/language-core'
import type * as ts from 'typescript'
import type { PipelineReqArgs, PipelineServerContext, TypeScriptSdk } from './types'
import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import { createParsedCommandLine, getDefaultCompilerOptions } from '@vue/language-core'
import { createVueVineLanguagePlugin, setupGlobalTypes } from '../src/index'
import { handleGetComponentDirectives } from './pipeline/get-component-directives'
import { handleGetComponentProps } from './pipeline/get-component-props'
import { handleGetDocumentHighlight } from './pipeline/get-document-highlight'
import { handleGetElementAttrs } from './pipeline/get-element-attrs'
import { proxyLanguageServiceForVine } from './proxy-ts-lang-service'

function ensureStrictTemplatesCheck(vueOptions: VueCompilerOptions) {
  vueOptions.checkUnknownComponents = true
  vueOptions.checkUnknownDirectives = true
  vueOptions.checkUnknownEvents = true
  vueOptions.checkUnknownProps = true
}

function createPipelineResponse(res: any): ts.server.HandlerResponse {
  return {
    response: res,
    responseRequired: true,
  }
}

function addPipelineHandlers(
  info: ts.server.PluginCreateInfo,
  ts: TypeScriptSdk,
  language: Language,
) {
  const projectService = info.project.projectService
  projectService.logger.info(`Vue Vine: called handler processing ${info.project.projectKind}`)
  if (!info.session) {
    projectService.logger.info('Vue Vine: there is no session in info.')
    return
  }
  const session = info.session
  if (!(session.addProtocolHandler as ((...args: any[]) => any) | undefined)) {
    projectService.logger.info('Vue Vine: there is no addProtocolHandler method.')
    return
  }
  const pipelineContext: PipelineServerContext = {
    ts,
    language,
    tsPluginInfo: info,
  }

  // Initialize pipeline handlers
  // @ts-expect-error - Untyped tsserver API
  const handlers = session.handlers as Map<
    string,
    (request: ts.server.protocol.Request) => ts.server.HandlerResponse
  >
  if (handlers.has('_vue_vine:projectInfo')) {
    return
  }

  session.addProtocolHandler('_vue_vine:projectInfo', (request) => {
    return handlers.get('projectInfo')!(request)
  })
  session.addProtocolHandler('_vue_vine:getComponentProps', (request) => {
    const { tagName, fileName } = request.arguments as PipelineReqArgs<'getComponentPropsRequest'>
    return createPipelineResponse(
      handleGetComponentProps(pipelineContext, fileName, tagName),
    )
  })
  session.addProtocolHandler('_vue_vine:getElementAttrs', (request) => {
    const { fileName, tagName } = request.arguments as PipelineReqArgs<'getElementAttrsRequest'>
    return createPipelineResponse(
      handleGetElementAttrs(pipelineContext, fileName, tagName),
    )
  })
  session.addProtocolHandler('_vue_vine:getComponentDirectives', (request) => {
    const { fileName, triggerAtFnName } = request.arguments as PipelineReqArgs<'getComponentDirectivesRequest'>
    return createPipelineResponse(
      handleGetComponentDirectives(pipelineContext, fileName, triggerAtFnName),
    )
  })
  session.addProtocolHandler('_vue_vine:getDocumentHighlight', (request) => {
    const { fileName, position } = request.arguments as PipelineReqArgs<'getDocumentHighlightRequest'>
    return createPipelineResponse(
      handleGetDocumentHighlight(pipelineContext, fileName, position),
    )
  })
}

export interface VueVineTypeScriptPluginOptions {
  // ...
}
export function createVueVineTypeScriptPlugin(_options: VueVineTypeScriptPluginOptions = {}): ts.server.PluginModuleFactory {
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
        // Initialize pipeline handlers
        addPipelineHandlers(info, ts, language)

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
