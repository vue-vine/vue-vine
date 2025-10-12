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
    ws.send(pipelineResponse(context, {
      type: 'getDocumentHighlightResponse',
      requestId,
      result: [],
      errMsg: err instanceof Error ? err.message : String(err),
    }))
  }
}
