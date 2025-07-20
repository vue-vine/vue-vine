import type { LanguageServiceContext, SourceScript, VirtualCode } from '@volar/language-service'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'

export function getVueVineVirtualCode(
  document: TextDocument,
  context: LanguageServiceContext,
): {
  docUri: URI
  sourceScriptId: URI | undefined
  sourceScript: SourceScript<URI> | undefined
  vineVirtualCode: VirtualCode | undefined
  embeddedVirtualCode: VirtualCode | undefined
} {
  const docUri = URI.parse(document.uri)
  const [sourceScriptId, embeddedCodeId] = context.decodeEmbeddedDocumentUri(docUri) ?? []
  const sourceScript = sourceScriptId && context.language.scripts.get(sourceScriptId)
  const vineVirtualCode = sourceScript?.generated?.root
  const embeddedVirtualCode = (embeddedCodeId && sourceScript?.generated?.embeddedCodes.get(embeddedCodeId)) || undefined

  return {
    docUri,
    sourceScriptId,
    sourceScript,
    vineVirtualCode,
    embeddedVirtualCode,
  }
}
