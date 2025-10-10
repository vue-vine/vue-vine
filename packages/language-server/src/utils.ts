import type { LanguageServiceContext, SourceScript, VirtualCode } from '@volar/language-service'
import type { VueCompilerOptions } from '@vue/language-core'
import type ts from 'typescript'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { setupGlobalTypes } from '@vue-vine/language-service'
import { getDefaultCompilerOptions } from '@vue/language-core'
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

export function getDefaultVueCompilerOptions(
  tsSystemHost: ts.System,
): VueCompilerOptions {
  const vueCompilerOptions: VueCompilerOptions = getDefaultCompilerOptions(
    (void 0),
    (void 0),
    true, // enable strict templates by default
  )
  vueCompilerOptions.globalTypesPath = setupGlobalTypes(
    vueCompilerOptions,
    tsSystemHost,
  )

  return vueCompilerOptions
}
