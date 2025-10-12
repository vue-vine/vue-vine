import type { PipelineRequestInstance, PipelineServerContext } from '../types'
import { isVueVineVirtualCode } from '../../src'
import { pipelineResponse } from '../utils'
import { getComponentProps } from '../visitors'

export function handleGetComponentProps(
  request: PipelineRequestInstance<'getComponentPropsRequest'>,
  context: PipelineServerContext,
): void {
  const { ws, language } = context
  const { requestId, componentName, fileName } = request

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
    ws.send(
      pipelineResponse(context, {
        type: 'getComponentPropsResponse',
        requestId,
        componentName,
        fileName,
        props,
      }),
    )
  }
  catch (err) {
    // Send empty response when error
    ws.send(
      pipelineResponse(context, {
        type: 'getComponentPropsResponse',
        requestId,
        componentName,
        fileName,
        props: [],
        errMsg: err instanceof Error ? err.message : String(err),
      }),
    )
  }
}
