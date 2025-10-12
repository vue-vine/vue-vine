import type { Language } from '@volar/language-server'
import type { PipelineRequest, PipelineServerContext, TsPluginInfo, TypeScriptSdk } from './types'
import { safeDestr } from 'destr'
import { WebSocketServer } from 'ws'
import { handleGetComponentDirectives } from './pipeline/get-component-directives'
import { handleGetComponentProps } from './pipeline/get-component-props'
import { handleGetDocumentHighlight } from './pipeline/get-document-highlight'
import { handleGetElementAttrs } from './pipeline/get-element-attrs'

// WebSocket close codes
// https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4.1
const WS_CLOSE_CODE_NORMAL = 1000

interface PipelineServerCreateParams {
  ts: TypeScriptSdk
  tsPluginInfo: TsPluginInfo
  language: Language
}
export function createVueVinePipelineServer(
  port: number,
  {
    ts,
    tsPluginInfo,
    language,
  }: PipelineServerCreateParams,
): WebSocketServer {
  const wss = new WebSocketServer({ port })

  wss.on('error', (err) => {
    // Check if this is a port already in use error
    const error = err as NodeJS.ErrnoException
    if (error.code === 'EADDRINUSE') {
      console.error(`Pipeline: Port ${port} is already in use. Server cannot start.`)
    }
    else {
      console.error('Pipeline: Server error:', err)
    }
  })
  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      let request: PipelineRequest | undefined
      try {
        request = safeDestr<PipelineRequest>(message.toString().trim())
      }
      catch (err) {
        console.error('Pipeline: Error parsing message:', err)
        return
      }

      if (request) {
        const context = {
          ts,
          tsPluginInfo,
          ws,
          language,
        }
        handlePipelineRequest(request, context)
      }
      else {
        console.warn('Pipeline: Received invalid request format')
      }
    })

    ws.on('error', (err) => {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'ECONNRESET') {
        console.info('Pipeline: Client connection reset')
      }
      else {
        console.error('Pipeline: Client error:', err)
      }
    })
    ws.on('close', (code, reason) => {
      if (code === WS_CLOSE_CODE_NORMAL) {
        console.info('Pipeline: Client disconnected normally')
      }
      else {
        console.info(`Pipeline: Client disconnected (code: ${code}, reason: ${reason || 'none'})`)
      }
    })
  })

  console.info(`Pipeline: Server is running on port ${port}`)
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
      case 'getDocumentHighlightRequest':
        handleGetDocumentHighlight(request, context)
        break
    }
  }
  catch (err) {
    console.error('Pipeline: Unhandled error during request:', err)
  }
}
