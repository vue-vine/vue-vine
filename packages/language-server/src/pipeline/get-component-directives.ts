import type { Connection } from '@volar/language-server'
import type { PipelineClientContext } from './types'
import { mergeTagInfo, sendTsServerRequest } from './shared'

export function getComponentDirectives(connection: Connection) {
  return async (
    context: PipelineClientContext,
    tag: string,
    triggerAtFnName: string,
  ): Promise<void> => {
    const response = await sendTsServerRequest<'getComponentDirectivesRequest'>(
      connection,
      'getComponentDirectives',
      { triggerAtFnName, fileName: context.vineVirtualCode?.fileName ?? '' },
    )

    if (response) {
      const currentTagInfo = context.tagInfos?.get(tag)
      context.tagInfos?.set(tag, mergeTagInfo(currentTagInfo, {
        props: [...response.directives],
        events: [],
      }))
    }
  }
}
