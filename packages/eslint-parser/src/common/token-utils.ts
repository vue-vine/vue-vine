import type { Token } from '../ast'
import type { VineTemplateMeta } from '../types'
import type { LinesAndColumns } from './lines-and-columns'

interface HasRange {
  range: [number, number]
}

/**
 * Create a simple token.
 * @param type The type of new token.
 * @param start The offset of the start position of new token.
 * @param end The offset of the end position of new token.
 * @param value The value of new token.
 * @returns The new token.
 */
export function createSimpleToken(
  type: string,
  start: number,
  end: number,
  value: string,
  linesAndColumns: LinesAndColumns,
): Token {
  return {
    type,
    range: [start, end],
    loc: {
      start: linesAndColumns.getLocFromIndex(start),
      end: linesAndColumns.getLocFromIndex(end),
    },
    value,
  }
}

/**
 * Insert the given comment tokens.
 * @param templateMeta template tokens, comments and errors.
 * @param newComments The comments to insert.
 */
export function insertComments(
  templateMeta: VineTemplateMeta,
  newComments: Token[],
): void {
  if (newComments.length === 0) {
    return
  }

  const index = templateMeta.comments.findIndex(comment => comment.range[0] === newComments[0].range[0])
  templateMeta.comments.splice(index, 0, ...newComments)
}

/**
 * Replace the tokens in the given range.
 * @param templateMeta template tokens, comments and errors.
 * @param node The node to specify the range of replacement.
 * @param newTokens The new tokens.
 */
export function replaceTokens(
  templateMeta: VineTemplateMeta,
  node: HasRange,
  newTokens: Token[],
): void {
  const index = templateMeta.tokens.findIndex(token => token.range[0] === node.range[0]) // include the start token
  const count = templateMeta.tokens.findIndex(token => token.range[1] === node.range[1]) - index + 1 // include the end token

  templateMeta.tokens.splice(index, count, ...newTokens)
}
