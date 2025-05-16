import type { Language } from '@volar/language-server'
import type { PipelineContext, PipelineLogger, PipelineRequest, TsPluginInfo, TypeScriptSdk } from './types'
import { WebSocketServer } from 'ws'
import { isVueVineVirtualCode } from '../src'
import { pipelineResponse } from './utils'
import { getComponentPropsAndEmits } from './visitors'

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

  tsPluginLogger.info(`Pipeline: Server is running on port ${port}`)
  return wss
}

function handlePipelineRequest(request: PipelineRequest, context: PipelineContext) {
  try {
    switch (request.type) {
      case 'getPropsAndEmitsRequest':
        handleGetComponentPropsAndEmits(request, context)
        break
    }
  }
  catch (err) {
    context.tsPluginLogger.error('Pipeline: Unhandled error during request:', err)
  }
}

function handleGetComponentPropsAndEmits(request: PipelineRequest, context: PipelineContext) {
  const { ws, language } = context
  const { componentName, fileName } = request

  const volarFile = language.scripts.get(fileName)
  if (!(isVueVineVirtualCode(volarFile?.generated?.root))) {
    return
  }
  const vineCode = volarFile.generated.root

  try {
    const props = getComponentPropsAndEmits(
      context,
      vineCode,
      componentName,
    )
    context.tsPluginLogger.info('Pipeline: Got component props', props)

    ws.send(
      pipelineResponse({
        type: 'getPropsAndEmitsResponse',
        props,
      }),
    )
  }
  catch (err) {
    context.tsPluginLogger.error('Pipeline: Error on getComponentProps:', err)
  }
}
