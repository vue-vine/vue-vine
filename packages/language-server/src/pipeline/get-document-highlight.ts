import type { Connection } from '@volar/language-server'
import type { PipelineClientContext } from './types'
import { sendTsServerRequest } from './shared'

export function getDocumentHighlight(connection: Connection) {
  return async (
    context: PipelineClientContext,
    position: number,
  ): Promise<void> => {
    const response = await sendTsServerRequest<'getDocumentHighlightRequest'>(
      connection,
      'getDocumentHighlight',
      { fileName: context.vineVirtualCode?.fileName ?? '', position },
    )

    if (response) {
      context.documentHighlights = response.result
    }
  }
}
