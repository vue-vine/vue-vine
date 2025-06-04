import type { FoldingRange, LanguageServicePlugin, Mapper } from '@volar/language-service'
import type { VineFnCompCtx } from '@vue-vine/compiler'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { _breakableTraverse } from '@vue-vine/compiler'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { URI } from 'vscode-uri'

function transformBabelLocationToRange(
  babelLoc: VineFnCompCtx['fnDeclNode']['loc'],
  document: TextDocument,
  mapper: Mapper,
) {
  let start = 0
  let end = 0

  // `toGeneratedLocation` is a generator so we need to iterate it to get the first value
  ;[start] = mapper.toGeneratedLocation(babelLoc?.start.index ?? 0).next().value ?? []
  ;[end] = mapper.toGeneratedLocation(babelLoc?.end.index ?? 0).next().value ?? []

  return {
    start: document.positionAt(start ?? 0),
    end: document.positionAt(end ?? 0),
  }
}

function addAllRangesForFnDecl(
  fnDeclNode: VineFnCompCtx['fnDeclNode'],
  document: TextDocument,
  mapper: Mapper,
  foldingRanges: FoldingRange[],
) {
  _breakableTraverse(
    fnDeclNode,
    (node) => {
      if (!node.loc) {
        return
      }
      // If this node's location is across multiple lines, add the range
      if (node.loc.start.line !== node.loc.end.line) {
        const { start, end } = transformBabelLocationToRange(node.loc, document, mapper)

        if (start && end) {
          foldingRanges.push({
            startLine: start.line,
            startCharacter: start.character,
            endLine: end.line,
            endCharacter: end.character,
            kind: 'region',
          })
        }
      }
    },
  )
}

export function createVineFoldingRangesPlugin(
  tsSyntacticService?: LanguageServicePlugin,
): LanguageServicePlugin {
  return {
    name: 'vue-vine-folding-ranges',
    capabilities: {
      foldingRangeProvider: true,
    },
    create(context) {
      return {
        provideFoldingRanges(document, token) {
          if (document.languageId !== 'typescript' && document.languageId !== 'ts') {
            return
          }

          // Get typescript original analyzed folding ranges
          const providedFoldingRanges = tsSyntacticService?.create(context)?.provideFoldingRanges?.(document, token)

          const foldingRanges = (providedFoldingRanges ?? []) as FoldingRange[]

          const docUri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(docUri)
          if (!decoded) {
            // Not a embedded document
            return foldingRanges
          }
          const [sourceScriptId, embeddedCodeId] = decoded
          const sourceScript = context.language.scripts.get(sourceScriptId)
          const virtualCode = sourceScript?.generated?.embeddedCodes?.get(embeddedCodeId)
          if (!sourceScript || !virtualCode || !isVueVineVirtualCode(virtualCode)) {
            return
          }

          const mapper = context.language.maps.get(
            virtualCode,
            sourceScript,
          )

          virtualCode.vineMetaCtx.vineFileCtx.vineCompFns.forEach((compFn) => {
            addVineCompFnFoldingRange(compFn)
          })

          return foldingRanges

          function addVineCompFnFoldingRange(compFn: VineFnCompCtx) {
            const fnDeclNode = compFn.fnDeclNode
            const { start, end } = transformBabelLocationToRange(fnDeclNode.loc, document, mapper)

            if (start && end) {
              foldingRanges.push({
                startLine: start.line,
                startCharacter: start.character,
                endLine: end.line,
                endCharacter: end.character,
                kind: 'region',
              })
            }

            addAllRangesForFnDecl(fnDeclNode, document, mapper, foldingRanges)
          }
        },
      }
    },
  }
}
