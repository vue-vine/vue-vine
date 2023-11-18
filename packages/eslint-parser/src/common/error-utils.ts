import { sortedIndexBy } from 'lodash-es'
import type { ParseError } from '../ast'
import type { VineTemplateMeta } from '../types'

/**
 * Get `x.pos`.
 * @param x The object to get.
 * @returns `x.pos`.
 */
function byIndex(x: ParseError): number {
  return x.index
}

/**
 * Insert the given error.
 * @param templateMeta template tokens, comments and errors.
 * @param error The error to insert.
 */
export function insertError(
  templateMeta: VineTemplateMeta,
  error: ParseError,
): void {
  const index = sortedIndexBy(templateMeta.errors, error, byIndex)
  templateMeta.errors.splice(index, 0, error)
}
