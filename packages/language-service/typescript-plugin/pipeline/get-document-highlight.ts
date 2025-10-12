import type { PipelineResponseInstance, PipelineServerContext } from '../types'

type GetDocumentHighlightResponse = PipelineResponseInstance<'getDocumentHighlightResponse'>

export function handleGetDocumentHighlight(
  context: PipelineServerContext,
  fileName: string,
  position: number,
): GetDocumentHighlightResponse {
  const { tsPluginInfo } = context
  const emptyResponse: GetDocumentHighlightResponse = {
    type: 'getDocumentHighlightResponse',
    result: [],
  }

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

    return {
      type: 'getDocumentHighlightResponse',
      result,
    }
  }
  catch (err) {
    return {
      ...emptyResponse,
      errMsg: err instanceof Error ? err.message : String(err),
    }
  }
}
