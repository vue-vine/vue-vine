import type { PipelineRequestInstance, PipelineServerContext } from '../types'
import { isVueVineVirtualCode } from '../../src'
import { pipelineResponse } from '../utils'
import { getComponentDirectives } from '../visitors'

export function handleGetComponentDirectives(
  request: PipelineRequestInstance<'getComponentDirectivesRequest'>,
  context: PipelineServerContext,
): void {
  const { ws, language } = context
  const { fileName, triggerAtFnName, requestId } = request

  const volarFile = language.scripts.get(fileName)
  if (!isVueVineVirtualCode(volarFile?.generated?.root)) {
    return
  }

  const vineCode = volarFile.generated.root

  try {
    const directives = getComponentDirectives(context, vineCode, triggerAtFnName)
    ws.send(
      pipelineResponse(context, {
        type: 'getComponentDirectivesResponse',
        requestId,
        triggerAtFnName,
        fileName,
        directives,
      }),
    )
  }
  catch (err) {
    context.tsPluginLogger.error('Pipeline: Failed to get element attrs', err)
    ws.send(
      pipelineResponse(context, {
        type: 'getComponentDirectivesResponse',
        requestId,
        triggerAtFnName,
        fileName,
        directives: [],
      }),
    )
  }
}
