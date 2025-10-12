import type { DocumentHighlightKind, LanguageServicePlugin } from '@volar/language-service'
import type { PipelineClientContext, PipelineInstance } from '../pipeline/types'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { getVueVineVirtualCode } from '../utils'

export function createDocumentHighlightForward(
  pipelineClient: PipelineInstance,
): LanguageServicePlugin {
  return {
    name: 'vine-document-highlights',
    capabilities: {
      documentHighlightProvider: true,
    },
    create(context) {
      return {
        async provideDocumentHighlights(document, position) {
          const { vineVirtualCode, embeddedVirtualCode } = getVueVineVirtualCode(document, context)
          if (embeddedVirtualCode?.id !== 'source' || !isVueVineVirtualCode(vineVirtualCode)) {
            return []
          }
          const pipelineClientContext: PipelineClientContext = {}
          pipelineClientContext.vineVirtualCode = vineVirtualCode
          pipelineClientContext.documentHighlights = []

          await pipelineClient.getDocumentHighlight(
            pipelineClientContext,
            document.offsetAt(position),
          )

          const result = pipelineClientContext.documentHighlights
          return result
            ?.filter(({ fileName }) => fileName === vineVirtualCode.fileName)
            .flatMap(({ highlightSpans }) => highlightSpans)
            .map(({ textSpan, kind }) => ({
              range: {
                start: document.positionAt(textSpan.start),
                end: document.positionAt(textSpan.start + textSpan.length),
              },
              kind: kind === 'reference'
                ? 2 satisfies typeof DocumentHighlightKind.Read
                : kind === 'writtenReference'
                  ? 3 satisfies typeof DocumentHighlightKind.Write
                  : 1 satisfies typeof DocumentHighlightKind.Text,
            }))
        },
      }
    },
  }
}
