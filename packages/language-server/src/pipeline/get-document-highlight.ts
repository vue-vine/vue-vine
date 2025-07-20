import type { PipelineClientContext } from './shared'
import { handlePipelineResponse } from './shared'

export function getDocumentHighlightFromPipeline(
  context: PipelineClientContext,
  position: number,
): Promise<void> {
  return handlePipelineResponse(
    context,
    {
      showConsoleLog: false,
      requestName: 'getDocumentHighlightRequest',
      onSend: (ws, requestId) => {
        if (!context.vineVirtualCode) {
          return
        }

        ws.send(JSON.stringify({
          type: 'getDocumentHighlightRequest',
          requestId,
          fileName: context.vineVirtualCode.fileName,
          position,
        }))
      },
      onMessageData: (response) => {
        console.log(`[DEBUG] response: `, response)
        context.documentHighlights = response.result
      },
    },
  )
}
