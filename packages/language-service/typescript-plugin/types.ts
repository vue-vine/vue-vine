import type { Language } from '@volar/language-server'
import type { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import type { WebSocket } from 'ws'

export type TypeScriptSdk = Parameters<Parameters<(typeof createLanguageServicePlugin)>[0]>[0]
export type TsPluginInfo = Parameters<Parameters<(typeof createLanguageServicePlugin)>[0]>[1]

type _pipelineReq<T extends { type: string }> = {
  requestId: string
} & T
type _pipelineResp<T extends { type: string }> = {
  requestId: string
} & T

export type PipelineRequest =
  | (_pipelineReq<{ type: 'getComponentPropsRequest', fileName: string, componentName: string }>)
  | (_pipelineReq<{ type: 'getElementAttrsRequest', fileName: string, tagName: string }>)
  | (_pipelineReq<{ type: 'getComponentDirectivesRequest', fileName: string, triggerAtFnName: string }>)
export type PipelineRequestInstance<T extends PipelineRequest['type']> = PipelineRequest & { type: T }

export type PipelineResponse =
  | (_pipelineResp<{ type: 'getComponentPropsResponse', componentName: string, fileName: string, props: string[] }>)
  | (_pipelineResp<{ type: 'getElementAttrsResponse', fileName: string, tagName: string, attrs: string[] }>)
  | (_pipelineResp<{ type: 'getComponentDirectivesResponse', fileName: string, triggerAtFnName: string, directives: string[] }>)
export type PipelineResponseInstance<T extends PipelineResponse['type']> = PipelineResponse & {
  type: T
  debugLogs: string[]
}

export interface PipelineServerContext {
  ts: TypeScriptSdk
  language: Language
  tsPluginInfo: TsPluginInfo
  ws: WebSocket
  tsPluginLogger: PipelineLogger
}

export interface PipelineLogger {
  enabled: boolean
  messages: string[]
  info: (...msg: any[]) => void
  error: (...msg: any[]) => void
}
