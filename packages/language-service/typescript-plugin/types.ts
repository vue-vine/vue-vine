import type { Language } from '@volar/language-server'
import type { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import type * as ts from 'typescript'

export type TypeScriptSdk = Parameters<Parameters<(typeof createLanguageServicePlugin)>[0]>[0]
export type TsPluginInfo = Parameters<Parameters<(typeof createLanguageServicePlugin)>[0]>[1]

type _pipelineReq<T extends { type: string }> = {
  // ... common properties
} & T
type _pipelineResp<T extends { type: string }> = {
  // ... common properties
} & T

export type PipelineRequest
  = | (_pipelineReq<{ type: 'getComponentPropsRequest', fileName: string, tagName: string }>)
    | (_pipelineReq<{ type: 'getElementAttrsRequest', fileName: string, tagName: string }>)
    | (_pipelineReq<{ type: 'getComponentDirectivesRequest', fileName: string, triggerAtFnName: string }>)
    | (_pipelineReq<{ type: 'getDocumentHighlightRequest', fileName: string, position: number }>)
    | (_pipelineReq<{ type: 'projectInfoRequest', file: string, needFileNameList: boolean }>)
export type PipelineRequestInstance<T extends PipelineRequest['type']> = PipelineRequest & { type: T }
export type PipelineReqArgs<T extends PipelineRequest['type']> = Omit<PipelineRequestInstance<T>, 'requestId' | 'type'>

export type PipelineResponse
  = | (_pipelineResp<{ type: 'getComponentPropsResponse', tagName: string, fileName: string, props: string[] }>)
    | (_pipelineResp<{ type: 'getElementAttrsResponse', tagName: string, fileName: string, attrs: string[] }>)
    | (_pipelineResp<{ type: 'getComponentDirectivesResponse', fileName: string, triggerAtFnName: string, directives: string[] }>)
    | (_pipelineResp<{ type: 'getDocumentHighlightResponse', result: ts.DocumentHighlights[] }>)
    | (_pipelineResp<{ type: 'projectInfoResponse', result: ts.server.protocol.ProjectInfo | null }>)
export type PipelineResponseInstance<T extends PipelineResponse['type']> = PipelineResponse & {
  type: T
  errMsg?: string
}

export type ReqToRespName<T extends PipelineRequest['type']> = T extends `${infer U}Request` ? `${U}Response` : never

export interface PipelineServerContext {
  ts: TypeScriptSdk
  language: Language
  tsPluginInfo: TsPluginInfo
}
