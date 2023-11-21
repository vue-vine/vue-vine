import sortedIndexBy from 'lodash/sortedIndexBy'
import sortedLastIndexBy from 'lodash/sortedLastIndexBy'
import type { Token } from '../ast'
import type { VineTemplateMeta } from '../types'
import type { LinesAndColumns } from './lines-and-columns'

interface HasRange {
  range: [number, number]
}

/**
 * Get `x.range[0]`.
 * @param x The object to get.
 * @returns `x.range[0]`.
 */
function byRange0(x: HasRange): number {
  return x.range[0]
}

/**
 * Get `x.range[1]`.
 * @param x The object to get.
 * @returns `x.range[1]`.
 */
function byRange1(x: HasRange): number {
  return x.range[1]
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

  const index = sortedIndexBy(templateMeta.comments, newComments[0], byRange0)
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
  const index = sortedIndexBy(templateMeta.tokens, node, byRange0)
  const count = sortedLastIndexBy(templateMeta.tokens, node, byRange1) - index
  templateMeta.tokens.splice(index, count, ...newTokens)
}
