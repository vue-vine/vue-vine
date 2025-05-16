import type { ParseError } from '../ast'
import type { VineTemplateMeta } from '../types'

/**
 * Insert the given error.
 * @param templateMeta template tokens, comments and errors.
 * @param error The error to insert.
 */
export function insertError(
  templateMeta: VineTemplateMeta,
  error: ParseError,
): void {
  const index = templateMeta.errors.findIndex(e => e.index === error.index)
  templateMeta.errors.splice(index, 0, error)
}
