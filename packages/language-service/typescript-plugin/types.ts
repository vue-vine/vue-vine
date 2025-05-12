import type { Language } from '@volar/language-server'
import type { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import type { WebSocket } from 'ws'

export type TypeScriptSdk = Parameters<Parameters<(typeof createLanguageServicePlugin)>[0]>[0]
export type TsPluginInfo = Parameters<Parameters<(typeof createLanguageServicePlugin)>[0]>[1]

export type PipelineRequest =
  | { type: 'getPropsAndEmitsRequest', componentName: string, fileName: string }

export type PipelineResponse =
  | { type: 'getPropsAndEmitsResponse', props: string[] }

export interface PipelineContext {
  ts: TypeScriptSdk
  tsPluginInfo: TsPluginInfo
  ws: WebSocket
  language: Language
  tsPluginLogger: PipelineLogger
}

export interface PipelineLogger {
  info: (...msg: any[]) => void
  error: (...msg: any[]) => void
}
