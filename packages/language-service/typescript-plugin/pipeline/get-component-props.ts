import type { PipelineResponseInstance, PipelineServerContext } from '../types'
import { isVueVineVirtualCode } from '../../src'
import { getComponentProps } from '../visitors'

type GetComponentPropsResponse = PipelineResponseInstance<'getComponentPropsResponse'>

export function handleGetComponentProps(
  context: PipelineServerContext,
  fileName: string,
  tagName: string,
): GetComponentPropsResponse {
  const { language } = context
  const volarFile = language.scripts.get(fileName)
  const emptyResponse: GetComponentPropsResponse = {
    type: 'getComponentPropsResponse',
    tagName,
    fileName,
    props: [],
  }

  if (!(isVueVineVirtualCode(volarFile?.generated?.root))) {
    return emptyResponse
  }
  const vineCode = volarFile.generated.root

  try {
    const props = getComponentProps(
      context,
      vineCode,
      tagName,
    )

    return {
      type: 'getComponentPropsResponse',
      tagName,
      fileName,
      props,
    }
  }
  catch (err) {
    // Send empty response when error
    return {
      ...emptyResponse,
      errMsg: err instanceof Error ? err.message : String(err),
    }
  }
}
