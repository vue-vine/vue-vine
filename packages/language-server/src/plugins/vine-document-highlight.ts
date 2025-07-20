import type { DocumentHighlightKind, LanguageServicePlugin } from '@volar/language-service'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { getDocumentHighlightFromPipeline } from '../pipeline/get-document-highlight'
import { createPipelineClientContext } from '../pipeline/shared'
import { getVueVineVirtualCode } from '../utils'

export function createDocumentHighlightForward(): LanguageServicePlugin {
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
          const tsConfigFileName = context.project.typescript!.configFileName!
          const tsHost = context.project.typescript!.sys
          const pipelineClientContext = createPipelineClientContext(
            tsConfigFileName,
            tsHost,
          )
          pipelineClientContext.vineVirtualCode = vineVirtualCode
          pipelineClientContext.documentHighlights = []

          await getDocumentHighlightFromPipeline(
            pipelineClientContext,
            document.offsetAt(position),
          )

          const result = pipelineClientContext.documentHighlights
          console.log(`[DEBUG] result: `, result)
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
