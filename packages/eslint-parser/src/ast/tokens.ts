import type { HasLocation } from './locations'

/**
 * Tokens.
 */
export interface Token extends HasLocation {
  /**
   * Token types.
   */
  type: string

  /**
   * Processed values.
   */
  value: string
}
