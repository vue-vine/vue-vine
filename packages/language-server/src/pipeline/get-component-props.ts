import type { PipelineClientContext } from './shared'
import { pipelineRequest } from '@vue-vine/language-service'
import { handlePipelineResponse, mergeTagInfo } from './shared'

export function getComponentPropsFromPipeline(
  tag: string,
  context: PipelineClientContext,
): Promise<void> {
  return handlePipelineResponse(
    context,
    {
      requestName: 'getComponentPropsRequest',
      onSend: (ws, requestId) => {
        ws.send(
          pipelineRequest({
            type: 'getComponentPropsRequest',
            requestId,
            componentName: tag,
            fileName: context.vineVirtualCode?.fileName ?? '',
          }),
        )
      },
      onMessageData: (response) => {
        const currentTagInfo = context.tagInfos?.get(tag)
        const props = [...response.props]
        context.tagInfos?.set(tag, mergeTagInfo(currentTagInfo, {
          props,
          events: [],
        }))
      },
    },
  )
}
