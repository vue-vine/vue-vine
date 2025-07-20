import type { PipelineClientContext } from './shared'
import { pipelineRequest } from '@vue-vine/language-service'
import { handlePipelineResponse, mergeTagInfo } from './shared'

export function getElementAttrsFromPipeline(
  tag: string,
  context: PipelineClientContext,
): Promise<void> {
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
            fileName: context.vineVirtualCode?.fileName ?? '',
          }),
        )
      },
      onMessageData: (response) => {
        const currentTagInfo = context.tagInfos?.get(tag)
        context.tagInfos?.set(tag, mergeTagInfo(currentTagInfo, {
          props: [...response.attrs],
          events: [],
        }))
      },
    },
  )
}
