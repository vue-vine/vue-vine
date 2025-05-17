import type { Language } from '@volar/language-server'
import type ts from 'typescript'
import type { PipelineContext, PipelineLogger, PipelineRequest, TsPluginInfo, TypeScriptSdk } from './types'
import { safeDestr } from 'destr'
import { WebSocketServer } from 'ws'
import { handleGetComponentProps } from './pipeline/get-component-props'
import { handleGetElementAttrs } from './pipeline/get-element-attrs'

interface PipelineServerCreateParams {
  ts: TypeScriptSdk
  tsPluginInfo: TsPluginInfo
  language: Language
  languageService: ts.LanguageService
  tsPluginLogger: PipelineLogger
}
export function createVueVinePipelineServer(
  port: number,
  {
    ts,
    tsPluginInfo,
    language,
    languageService,
    tsPluginLogger,
  }: PipelineServerCreateParams,
) {
  const wss = new WebSocketServer({ port })

  wss.on('error', (err) => {
    tsPluginLogger.error('Pipeline: Server error:', err)
  })
  wss.on('connection', (ws) => {
    tsPluginLogger.info('Pipeline: Client connected')

    ws.on('message', (message) => {
      tsPluginLogger.info('Pipeline: Recieved message.')

      let request: PipelineRequest | undefined
      try {
        request = safeDestr<PipelineRequest>(message.toString().trim())
      }
      catch (err) {
        tsPluginLogger.error('Pipeline: Error parsing message:', err)
      }

      if (request) {
        const context = {
          ts,
          tsPluginInfo,
          ws,
          language,
          languageService,
          tsPluginLogger,
        }
        handlePipelineRequest(request, context)
      }
    })

    ws.on('error', (err) => {
      tsPluginLogger.error('Pipeline: Client error:', err)
    })
    ws.on('close', () => {
      tsPluginLogger.info('Pipeline: Client disconnected')
    })
  })

  tsPluginLogger.info(`Pipeline: Server is running on port ${port}`)
  return wss
}

function handlePipelineRequest(request: PipelineRequest, context: PipelineContext) {
  try {
    switch (request.type) {
      case 'getComponentPropsRequest':
        handleGetComponentProps(request, context)
        break
      case 'getElementAttrsRequest':
        handleGetElementAttrs(request, context)
        break
    }
  }
  catch (err) {
    context.tsPluginLogger.error('Pipeline: Unhandled error during request:', err)
  }
}
