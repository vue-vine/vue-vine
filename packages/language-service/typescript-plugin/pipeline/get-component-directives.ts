import type { PipelineResponseInstance, PipelineServerContext } from '../types'
import { isVueVineVirtualCode } from '../../src'
import { getComponentDirectives } from '../visitors'

type GetComponentDirectivesResponse = PipelineResponseInstance<'getComponentDirectivesResponse'>

export function handleGetComponentDirectives(
  context: PipelineServerContext,
  fileName: string,
  triggerAtFnName: string,
): GetComponentDirectivesResponse {
  const { language } = context
  const emptyResponse: GetComponentDirectivesResponse = {
    type: 'getComponentDirectivesResponse',
    fileName,
    triggerAtFnName,
    directives: [],
  }

  const volarFile = language.scripts.get(fileName)
  if (!isVueVineVirtualCode(volarFile?.generated?.root)) {
    return emptyResponse
  }

  const vineCode = volarFile.generated.root

  try {
    const directives = getComponentDirectives(context, vineCode, triggerAtFnName)
    return {
      type: 'getComponentDirectivesResponse',
      fileName,
      triggerAtFnName,
      directives,
    }
  }
  catch (err) {
    return {
      ...emptyResponse,
      errMsg: err instanceof Error ? err.message : String(err),
    }
  }
}
