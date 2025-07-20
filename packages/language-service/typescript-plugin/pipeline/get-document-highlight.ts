import type { PipelineRequestInstance, PipelineServerContext } from '../types'
import { pipelineResponse } from '../utils'

export function handleGetDocumentHighlight(
  request: PipelineRequestInstance<'getDocumentHighlightRequest'>,
  context: PipelineServerContext,
): void {
  const { ws, tsPluginInfo } = context
  const { fileName, position, requestId } = request

  try {
    // @ts-expect-error - Using internal tsserver API
    const getDocumentHighlights = tsPluginInfo.session?.handlers?.get('documentHighlights-full')
    const { response: result = [] } = getDocumentHighlights({
      arguments: {
        file: fileName,
        position,
        filesToSearch: [fileName],
      },
    })

    ws.send(pipelineResponse(context, {
      type: 'getDocumentHighlightResponse',
      requestId,
      result,
    }))
  }
  catch (err) {
    context.tsPluginLogger.error('Pipeline: Failed to get document highlight', err)
    ws.send(pipelineResponse(context, {
      type: 'getDocumentHighlightResponse',
      requestId,
      result: [],
    }))
  }
}
