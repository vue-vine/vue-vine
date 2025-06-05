import type { PipelineClientContext } from './shared'
import { pipelineRequest } from '@vue-vine/language-service'
import { handlePipelineResponse, mergeTagInfo } from './shared'

export function getComponentDirectivesFromPipeline(
  tag: string,
  triggerAtFnName: string,
  context: PipelineClientContext,
): Promise<void> {
  return handlePipelineResponse(
    context,
    {
      requestName: 'getComponentDirectivesRequest',
      onSend: (ws, requestId) => {
        console.log(`Pipeline: Fetching directives when trigger at component '${triggerAtFnName}', requestId: ${requestId}`)
        ws.send(
          pipelineRequest({
            type: 'getComponentDirectivesRequest',
            requestId,
            triggerAtFnName,
            fileName: context.vineVirtualCode.fileName,
          }),
        )
      },
      onMessageData: (response) => {
        const currentTagInfo = context.tagInfos.get(tag)
        context.tagInfos.set(tag, mergeTagInfo(currentTagInfo, {
          props: [...response.directives],
          events: [],
        }))
      },
    },
  )
}
