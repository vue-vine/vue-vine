import type { Connection } from '@volar/language-server'
import type ts from 'typescript'
import { sendTsServerRequest } from './shared'

export function getAutoImportSuggestions(connection: Connection) {
  return async (
    fileName: string,
    position: number,
  ): Promise<ts.CompletionInfo | null> => {
    const response = await sendTsServerRequest<'getAutoImportSuggestionsRequest'>(
      connection,
      'getAutoImportSuggestions',
      { fileName, position },
    )

    return response?.result ?? null
  }
}
