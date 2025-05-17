import type { PipelineClientContext } from './shared'
import { pipelineRequest } from '@vue-vine/language-service'
import { handlePipelineResponse } from './shared'

export function getElementAttrsFromPipeline(
  tag: string,
  context: PipelineClientContext,
) {
  return handlePipelineResponse(
    context,
    {
      requestName: 'getElementAttrsRequest',
      onSend: (ws, requestId) => {
        console.log(`Pipeline: Fetching element '${tag}' attrs, requestId: ${requestId}`)
        ws.send(
          pipelineRequest({
            type: 'getElementAttrsRequest',
            requestId,
            tagName: tag,
            fileName: context.vineVirtualCode.fileName,
          }),
        )
      },
      onMessageData: (response) => {
        context.tagInfos.set(tag, {
          props: [...response.attrs],
          events: [],
        })
      },
    },
  )
}
