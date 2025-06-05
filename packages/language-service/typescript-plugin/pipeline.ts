import type { Language } from '@volar/language-server'
import type { PipelineLogger, PipelineRequest, PipelineServerContext, TsPluginInfo, TypeScriptSdk } from './types'
import { safeDestr } from 'destr'
import { WebSocketServer } from 'ws'
import { handleGetComponentDirectives } from './pipeline/get-component-directives'
import { handleGetComponentProps } from './pipeline/get-component-props'
import { handleGetElementAttrs } from './pipeline/get-element-attrs'

interface PipelineServerCreateParams {
  ts: TypeScriptSdk
  tsPluginInfo: TsPluginInfo
  language: Language
  tsPluginLogger: PipelineLogger
}
export function createVueVinePipelineServer(
  port: number,
  {
    ts,
    tsPluginInfo,
    language,
    tsPluginLogger,
  }: PipelineServerCreateParams,
): WebSocketServer {
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

function handlePipelineRequest(request: PipelineRequest, context: PipelineServerContext): void {
  try {
    switch (request.type) {
      case 'getComponentPropsRequest':
        handleGetComponentProps(request, context)
        break
      case 'getElementAttrsRequest':
        handleGetElementAttrs(request, context)
        break
      case 'getComponentDirectivesRequest':
        handleGetComponentDirectives(request, context)
        break
    }
  }
  catch (err) {
    context.tsPluginLogger.error('Pipeline: Unhandled error during request:', err)
  }
}
