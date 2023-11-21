import type { Location } from './locations'

/**
 * Check whether the given value has acorn style location information.
 * @param x The value to check.
 * @returns `true` if the value has acorn style location information.
 */
function isAcornStyleParseError(
  x: any,
): x is { message: string; pos: number; loc: Location } {
  return (
    typeof x.message === 'string'
        && typeof x.pos === 'number'
        && typeof x.loc === 'object'
        && x.loc !== null
        && typeof x.loc.line === 'number'
        && typeof x.loc.column === 'number'
  )
}

/**
 * Check whether the given value is probably a TSError.
 * @param x The value to check.
 * @returns `true` if the given value is probably a TSError.
 */
function isTSError(
  x: any,
): x is { message: string; index: number; lineNumber: number; column: number } {
  return (
    !(x instanceof ParseError)
        && typeof x.message === 'string'
        && typeof x.index === 'number'
        && typeof x.lineNumber === 'number'
        && typeof x.column === 'number'
        && x.name === 'TSError'
  )
}

/**
 * HTML parse errors.
 */
export class ParseError extends SyntaxError {
  public code?: ErrorCode
  public index: number
  public lineNumber: number
  public column: number

  /**
   * Create new parser error object.
   * @param code The error code. See also: https://html.spec.whatwg.org/multipage/parsing.html#parse-errors
   * @param offset The offset number of this error.
   * @param line The line number of this error.
   * @param column The column number of this error.
   */
  public static fromCode(
    code: ErrorCode,
    offset: number,
    line: number,
    column: number,
  ): ParseError {
    return new ParseError(code, code, offset, line, column)
  }

  /**
   * Normalize the error object.
   * @param x The error object to normalize.
   */
  public static normalize(x: any): ParseError | null {
    if (isTSError(x)) {
      return new ParseError(
        x.message,
        undefined,
        x.index,
        x.lineNumber,
        x.column,
      )
    }
    if (ParseError.isParseError(x)) {
      return x
    }
    if (isAcornStyleParseError(x)) {
      return new ParseError(
        x.message,
        undefined,
        x.pos,
        x.loc.line,
        x.loc.column,
      )
    }
    return null
  }

  /**
   * Initialize this ParseError instance.
   * @param message The error message.
   * @param code The error code. See also: https://html.spec.whatwg.org/multipage/parsing.html#parse-errors
   * @param offset The offset number of this error.
   * @param line The line number of this error.
   * @param column The column number of this error.
   */
  public constructor(
    message: string,
    code: ErrorCode | undefined,
    offset: number,
    line: number,
    column: number,
  ) {
    super(message)
    this.code = code
    this.index = offset
    this.lineNumber = line
    this.column = column
  }

  /**
   * Type guard for ParseError.
   * @param x The value to check.
   * @returns `true` if the value has `message`, `pos`, `loc` properties.
   */
  public static isParseError(x: any): x is ParseError {
    return (
      x instanceof ParseError
            || (typeof x.message === 'string'
                && typeof x.index === 'number'
                && typeof x.lineNumber === 'number'
                && typeof x.column === 'number')
    )
  }
}

/**
 * The error codes of HTML syntax errors.
 * https://html.spec.whatwg.org/multipage/parsing.html#parse-errors
 */
export type ErrorCode =
    | 'abrupt-closing-of-empty-comment'
    | 'absence-of-digits-in-numeric-character-reference'
    | 'cdata-in-html-content'
    | 'character-reference-outside-unicode-range'
    | 'control-character-in-input-stream'
    | 'control-character-reference'
    | 'eof-before-tag-name'
    | 'eof-in-cdata'
    | 'eof-in-comment'
    | 'eof-in-tag'
    | 'incorrectly-closed-comment'
    | 'incorrectly-opened-comment'
    | 'invalid-first-character-of-tag-name'
    | 'missing-attribute-value'
    | 'missing-end-tag-name'
    | 'missing-semicolon-after-character-reference'
    | 'missing-whitespace-between-attributes'
    | 'nested-comment'
    | 'noncharacter-character-reference'
    | 'noncharacter-in-input-stream'
    | 'null-character-reference'
    | 'surrogate-character-reference'
    | 'surrogate-in-input-stream'
    | 'unexpected-character-in-attribute-name'
    | 'unexpected-character-in-unquoted-attribute-value'
    | 'unexpected-equals-sign-before-attribute-name'
    | 'unexpected-null-character'
    | 'unexpected-question-mark-instead-of-tag-name'
    | 'unexpected-solidus-in-tag'
    | 'unknown-named-character-reference'
    | 'end-tag-with-attributes'
    | 'duplicate-attribute'
    | 'end-tag-with-trailing-solidus'
    | 'non-void-html-element-start-tag-with-trailing-solidus'
    | 'x-invalid-end-tag'
    | 'x-invalid-namespace'
    | 'x-missing-interpolation-end'
// ---- Use RAWTEXT state for <script> elements instead ----
// "eof-in-script-html-comment-like-text" |
// ---- Use BOGUS_COMMENT state for DOCTYPEs instead ----
// "abrupt-doctype-public-identifier" |
// "abrupt-doctype-system-identifier" |
// "eof-in-doctype" |
// "invalid-character-sequence-after-doctype-name" |
// "missing-doctype-name" |
// "missing-doctype-public-identifier" |
// "missing-doctype-system-identifier" |
// "missing-quote-before-doctype-public-identifier" |
// "missing-quote-before-doctype-system-identifier" |
// "missing-whitespace-after-doctype-public-keyword" |
// "missing-whitespace-after-doctype-system-keyword" |
// "missing-whitespace-before-doctype-name" |
// "missing-whitespace-between-doctype-public-and-system-identifiers" |
// "unexpected-character-after-doctype-system-identifier" |
