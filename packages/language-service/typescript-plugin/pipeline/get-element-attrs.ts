import type { PipelineContext, PipelineRequestInstance } from '../types'
import { isVueVineVirtualCode } from '../../src'
import { pipelineResponse } from '../utils'
import { getElementAttrs } from '../visitors'

export function handleGetElementAttrs(
  request: PipelineRequestInstance<'getElementAttrsRequest'>,
  context: PipelineContext,
) {
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
      pipelineResponse({
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
      pipelineResponse({
        type: 'getElementAttrsResponse',
        requestId,
        tagName,
        fileName,
        attrs: [],
      }),
    )
  }
}
