import type { Language } from '@volar/language-server'
import type { PipelineContext, PipelineLogger, PipelineRequest, TsPluginInfo, TypeScriptSdk } from './types'
import { WebSocketServer } from 'ws'
import { isVueVineVirtualCode } from '../src'
import { getComponentProps, pipelineResponse } from './visitors'

export const VINE_PIPELINE_PORT = 15193

interface PipelineServerCreateParams {
  ts: TypeScriptSdk
  tsPluginInfo: TsPluginInfo
  language: Language
  tsPluginLogger: PipelineLogger
}
export function createVueVinePipelineServer({
  ts,
  tsPluginInfo,
  language,
  tsPluginLogger,
}: PipelineServerCreateParams) {
  const wss = new WebSocketServer({ port: VINE_PIPELINE_PORT })

  wss.on('error', (err) => {
    tsPluginLogger.error('Pipeline: Server error:', err)
  })
  wss.on('connection', (ws) => {
    tsPluginLogger.info('Pipeline: Client connected')

    ws.on('message', (message) => {
      tsPluginLogger.info('Pipeline: Recieved message.')

      let request: PipelineRequest | undefined
      try {
        request = JSON.parse(message.toString().trim()) as PipelineRequest
      }
      catch (err) {
        tsPluginLogger.error('Pipeline: Error parsing message:', err)
      }

      if (request) {
        const context = { ts, tsPluginInfo, ws, language, tsPluginLogger }
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

  tsPluginLogger.info(`Pipeline: Server is running on port ${VINE_PIPELINE_PORT}`)
  return wss
}

function handlePipelineRequest(request: PipelineRequest, context: PipelineContext) {
  try {
    switch (request.type) {
      case 'getComponentPropsRequest':
        handleGetComponentProps(request, context)
        break
    }
  }
  catch (err) {
    context.tsPluginLogger.error('Pipeline: Unhandled error during request:', err)
  }
}

function handleGetComponentProps(request: PipelineRequest, context: PipelineContext) {
  const { ws, language } = context
  const { componentName, fileName } = request

  const volarFile = language.scripts.get(fileName)
  if (!(isVueVineVirtualCode(volarFile?.generated?.root))) {
    return
  }
  const vineCode = volarFile.generated.root

  try {
    const props = getComponentProps(
      context,
      vineCode,
      componentName,
    )
    context.tsPluginLogger.info('Pipeline: Got component props', props)

    ws.send(
      pipelineResponse({
        type: 'getComponentPropsResponse',
        props,
      }),
    )
  }
  catch (err) {
    context.tsPluginLogger.error('Pipeline: Error on getComponentProps:', err)
  }
}
