import type { Connection } from '@volar/language-server'
import type { PipelineClientContext } from './types'
import { mergeTagInfo, sendTsServerRequest } from './shared'

export function getComponentProps(connection: Connection) {
  return async (
    context: PipelineClientContext,
    tagName: string,
  ): Promise<void> => {
    const response = await sendTsServerRequest<'getComponentPropsRequest'>(
      connection,
      'getComponentProps',
      { tagName, fileName: context.vineVirtualCode?.fileName ?? '' },
    )

    if (response) {
      const currentTagInfo = context.tagInfos?.get(tagName)
      context.tagInfos?.set(tagName, mergeTagInfo(currentTagInfo, {
        props: [...response.props],
        events: [],
      }))
    }
  }
}
