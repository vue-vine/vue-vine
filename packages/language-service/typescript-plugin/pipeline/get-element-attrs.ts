import type { PipelineResponseInstance, PipelineServerContext } from '../types'
import { isVueVineVirtualCode } from '../../src'
import { getElementAttrs } from '../visitors'

type GetElementAttrsResponse = PipelineResponseInstance<'getElementAttrsResponse'>

export function handleGetElementAttrs(
  context: PipelineServerContext,
  fileName: string,
  tagName: string,
): GetElementAttrsResponse {
  const { language } = context
  const emptyResponse: GetElementAttrsResponse = {
    type: 'getElementAttrsResponse',
    tagName,
    fileName,
    attrs: [],
  }

  const volarFile = language.scripts.get(fileName)
  if (!isVueVineVirtualCode(volarFile?.generated?.root)) {
    return emptyResponse
  }

  const vineCode = volarFile.generated.root

  try {
    const attrs = getElementAttrs(context, vineCode, tagName)
    return {
      type: 'getElementAttrsResponse',
      tagName,
      fileName,
      attrs,
    }
  }
  catch (err) {
    return {
      ...emptyResponse,
      errMsg: err instanceof Error ? err.message : String(err),
    }
  }
}
