import type { VueCodeInformation } from '@vue/language-core'
import type * as ts from 'typescript'
import type { PipelineResponseInstance, PipelineServerContext } from '../types'
import { isVueVineVirtualCode } from '../../src'

type GetAutoImportSuggestionsResponse = PipelineResponseInstance<'getAutoImportSuggestionsResponse'>

export function handleGetAutoImportSuggestions(
  context: PipelineServerContext,
  fileName: string,
  position: number,
  session: ts.server.Session | undefined,
): GetAutoImportSuggestionsResponse {
  const { language, tsPluginInfo } = context
  const volarFile = language.scripts.get(fileName)
  const emptyResponse: GetAutoImportSuggestionsResponse = {
    type: 'getAutoImportSuggestionsResponse',
    result: null,
  }

  if (!isVueVineVirtualCode(volarFile?.generated?.root)) {
    return emptyResponse
  }

  const vineCode = volarFile.generated.root
  const languageService = tsPluginInfo.languageService

  // Get preferences from session if available
  const preferences = session
    ? (session as any).getPreferences?.(fileName)
    : undefined
  const formatOptions = session
    ? (session as any).getFormatOptions?.(fileName)
    : undefined

  try {
    // Search for __importCompletion mapping that matches the source position
    const generatedOffset = findImportCompletionOffset(vineCode.mappings, position)

    if (generatedOffset !== undefined) {
      const result = languageService.getCompletionsAtPosition(
        fileName,
        generatedOffset,
        preferences,
        formatOptions,
      )
      if (result) {
        // Keep only auto-import entries (entries that have a `source` field)
        result.entries = result.entries.filter(entry => entry.source)
        return { type: 'getAutoImportSuggestionsResponse', result }
      }
    }

    // Fallback: query at position 0 (global scope) to get all importable identifiers.
    // This handles the case when the user types a NEW component name not yet in the template.
    const fallbackResult = languageService.getCompletionsAtPosition(
      fileName,
      0,
      preferences,
      formatOptions,
    )
    if (fallbackResult) {
      fallbackResult.entries = fallbackResult.entries.filter(entry => entry.source)
      return { type: 'getAutoImportSuggestionsResponse', result: fallbackResult }
    }

    return emptyResponse
  }
  catch (err) {
    return {
      ...emptyResponse,
      errMsg: err instanceof Error ? err.message : String(err),
    }
  }
}

function findImportCompletionOffset(
  mappings: readonly { sourceOffsets: readonly number[], generatedOffsets: readonly number[], lengths: readonly number[], data: any }[],
  sourcePosition: number,
): number | undefined {
  for (const mapping of mappings) {
    const data = mapping.data as VueCodeInformation | undefined
    if (!data?.__importCompletion) {
      continue
    }
    for (let i = 0; i < mapping.sourceOffsets.length; i++) {
      const sourceStart = mapping.sourceOffsets[i]!
      const length = mapping.lengths[i]!
      if (sourcePosition >= sourceStart && sourcePosition <= sourceStart + length) {
        return mapping.generatedOffsets[i]
      }
    }
  }
  return undefined
}
