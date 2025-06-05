import type { PipelineRequestInstance, PipelineServerContext } from '../types'
import { isVueVineVirtualCode } from '../../src'
import { pipelineResponse } from '../utils'
import { getElementAttrs } from '../visitors'

export function handleGetElementAttrs(
  request: PipelineRequestInstance<'getElementAttrsRequest'>,
  context: PipelineServerContext,
): void {
  const { ws, language } = context
  const { fileName, tagName, requestId } = request

  const volarFile = language.scripts.get(fileName)
  if (!isVueVineVirtualCode(volarFile?.generated?.root)) {
    return
  }

  const vineCode = volarFile.generated.root

  try {
    const attrs = getElementAttrs(context, vineCode, tagName)
    ws.send(
      pipelineResponse(context, {
        type: 'getElementAttrsResponse',
        requestId,
        tagName,
        fileName,
        attrs,
      }),
    )
  }
  catch (err) {
    context.tsPluginLogger.error('Pipeline: Failed to get element attrs', err)
    ws.send(
      pipelineResponse(context, {
        type: 'getElementAttrsResponse',
        requestId,
        tagName,
        fileName,
        attrs: [],
      }),
    )
  }
}
