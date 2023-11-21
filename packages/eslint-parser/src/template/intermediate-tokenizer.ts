import assert from 'node:assert'
import last from 'lodash/last'
import type {
  ErrorCode,
  HasLocation,
  Namespace,
  Token,
  VAttribute,
} from '../ast'
import { ParseError } from '../ast'
import { debug } from '../common/debug'
import type { VineESLintParserOptions } from '../types'
import type { TokenType, Tokenizer, TokenizerState } from './tokenizer'

const DUMMY_PARENT: any = Object.freeze({})

/**
 * Concatenate token values.
 * @param text Concatenated text.
 * @param token The token to concatenate.
 */
function concat(text: string, token: Token): string {
  return text + token.value
}

/**
 * The type of intermediate tokens.
 */
export type IntermediateToken = StartTag | EndTag | Text | Mustache

/**
 * The type of start tags.
 */
export interface StartTag extends HasLocation {
  type: 'StartTag'
  name: string
  rawName: string
  selfClosing: boolean
  attributes: VAttribute[]
}

/**
 * The type of end tags.
 */
export interface EndTag extends HasLocation {
  type: 'EndTag'
  name: string
}

/**
 * The type of text chunks.
 */
export interface Text extends HasLocation {
  type: 'Text'
  value: string
}

/**
 * The type of text chunks of an expression container.
 */
export interface Mustache extends HasLocation {
  type: 'Mustache'
  value: string
  startToken: Token
  endToken: Token
}

/**
 * The class to create HTML tokens from ESTree-like tokens which are created by a Tokenizer.
 */
export class IntermediateTokenizer {
  private tokenizer: Tokenizer
  private baseParserOptions: VineESLintParserOptions
  private currentToken: IntermediateToken | null
  private attribute: VAttribute | null
  private attributeNames: Set<string>
  private expressionStartToken: Token | null
  private expressionTokens: Token[]

  public readonly tokens: Token[]
  public readonly comments: Token[]

  /**
   * The source code text.
   */
  public get text(): string {
    return this.tokenizer.text
  }

  /**
   * The parse errors.
   */
  public get errors(): ParseError[] {
    return this.tokenizer.errors
  }

  /**
   * The current state.
   */
  public get state(): TokenizerState {
    return this.tokenizer.state
  }

  public set state(value: TokenizerState) {
    this.tokenizer.state = value
  }

  /**
   * The current namespace.
   */
  public get namespace(): Namespace {
    return this.tokenizer.namespace
  }

  public set namespace(value: Namespace) {
    this.tokenizer.namespace = value
  }

  /**
   * The current flag of expression enabled.
   */
  public get expressionEnabled(): boolean {
    return this.tokenizer.expressionEnabled
  }

  public set expressionEnabled(value: boolean) {
    this.tokenizer.expressionEnabled = value
  }

  /**
   * Initialize this intermediate tokenizer.
   * @param tokenizer The tokenizer.
   */
  public constructor(tokenizer: Tokenizer, parserOptions: VineESLintParserOptions) {
    this.tokenizer = tokenizer
    this.baseParserOptions = parserOptions
    this.currentToken = null
    this.attribute = null
    this.attributeNames = new Set<string>()
    this.expressionStartToken = null
    this.expressionTokens = []
    this.tokens = []
    this.comments = []
  }

  /**
   * Get the next intermediate token.
   * @returns The intermediate token or null.
   */
  public nextToken(): IntermediateToken | null {
    let token: Token | null = null
    let result: IntermediateToken | null = null

    while (result == null) {
      token = this.tokenizer.nextToken()
      if (token == null) {
        break
      }
      result = this[token.type as TokenType](token)
    }

    if (result == null && token == null && this.currentToken != null) {
      result = this.commit()
    }

    return result
  }

  /**
   * Commit the current token.
   */
  private commit(): IntermediateToken {
    assert(this.currentToken != null || this.expressionStartToken != null)

    let token = this.currentToken
    this.currentToken = null
    this.attribute = null

    if (this.expressionStartToken != null) {
      // VExpressionEnd was not found.
      // Concatenate the deferred tokens to the committed token.
      const start = this.expressionStartToken
      const end = last(this.expressionTokens) || start
      const value = this.expressionTokens.reduce(concat, start.value)
      this.expressionStartToken = null
      this.expressionTokens = []

      if (token == null) {
        token = {
          type: 'Text',
          range: [start.range[0], end.range[1]],
          loc: { start: start.loc.start, end: end.loc.end },
          value,
        }
      }
      else if (token.type === 'Text') {
        token.range[1] = end.range[1]
        token.loc.end = end.loc.end
        token.value += value
      }
      else {
        throw new Error('unreachable')
      }
    }

    return token as IntermediateToken
  }

  /**
   * Report an invalid character error.
   * @param token The invalid token.
   * @param code The error code.
   */
  private reportParseError(token: HasLocation, code: ErrorCode): void {
    const error = ParseError.fromCode(
      code,
      token.range[0],
      token.loc.start.line,
      token.loc.start.column,
    )
    this.errors.push(error)

    debug('[html] syntax error:', error.message)
  }

  /**
   * Process the given comment token.
   * @param token The comment token to process.
   */
  private processComment(token: Token): IntermediateToken | null {
    this.comments.push(token)

    if (this.currentToken != null && this.currentToken.type === 'Text') {
      return this.commit()
    }
    return null
  }

  /**
   * Process the given text token.
   * @param token The text token to process.
   */
  private processText(token: Token): IntermediateToken | null {
    this.tokens.push(token)

    let result: IntermediateToken | null = null

    if (this.expressionStartToken != null) {
      // Defer this token until a VExpressionEnd token or a non-text token appear.
      const lastToken
                = last(this.expressionTokens) || this.expressionStartToken
      if (lastToken.range[1] === token.range[0]) {
        this.expressionTokens.push(token)
        return null
      }

      result = this.commit()
    }
    else if (this.currentToken != null) {
      // Concatenate this token to the current text token.
      if (
        this.currentToken.type === 'Text'
                && this.currentToken.range[1] === token.range[0]
      ) {
        this.currentToken.value += token.value
        this.currentToken.range[1] = token.range[1]
        this.currentToken.loc.end = token.loc.end
        return null
      }

      result = this.commit()
    }
    assert(this.currentToken == null)

    this.currentToken = {
      type: 'Text',
      range: [token.range[0], token.range[1]],
      loc: { start: token.loc.start, end: token.loc.end },
      value: token.value,
    }

    return result
  }

  /**
   * Process a HTMLAssociation token.
   * @param token The token to process.
   */
  protected HTMLAssociation(token: Token): IntermediateToken | null {
    this.tokens.push(token)

    if (this.attribute != null) {
      this.attribute.range[1] = token.range[1]
      this.attribute.loc.end = token.loc.end

      if (
        this.currentToken == null
                || this.currentToken.type !== 'StartTag'
      ) {
        throw new Error('unreachable')
      }
      this.currentToken.range[1] = token.range[1]
      this.currentToken.loc.end = token.loc.end
    }

    return null
  }

  /**
   * Process a HTMLBogusComment token.
   * @param token The token to process.
   */
  protected HTMLBogusComment(token: Token): IntermediateToken | null {
    return this.processComment(token)
  }

  /**
   * Process a HTMLCDataText token.
   * @param token The token to process.
   */
  protected HTMLCDataText(token: Token): IntermediateToken | null {
    return this.processText(token)
  }

  /**
   * Process a HTMLComment token.
   * @param token The token to process.
   */
  protected HTMLComment(token: Token): IntermediateToken | null {
    return this.processComment(token)
  }

  /**
   * Process a HTMLEndTagOpen token.
   * @param token The token to process.
   */
  protected HTMLEndTagOpen(token: Token): IntermediateToken | null {
    this.tokens.push(token)

    let result: IntermediateToken | null = null

    if (this.currentToken != null || this.expressionStartToken != null) {
      result = this.commit()
    }

    this.currentToken = {
      type: 'EndTag',
      range: [token.range[0], token.range[1]],
      loc: { start: token.loc.start, end: token.loc.end },
      name: token.value,
    }

    return result
  }

  /**
   * Process a HTMLIdentifier token.
   * @param token The token to process.
   */
  protected HTMLIdentifier(token: Token): IntermediateToken | null {
    this.tokens.push(token)

    if (
      this.currentToken == null
            || this.currentToken.type === 'Text'
            || this.currentToken.type === 'Mustache'
    ) {
      throw new Error('unreachable')
    }
    if (this.currentToken.type === 'EndTag') {
      this.reportParseError(token, 'end-tag-with-attributes')
      return null
    }
    if (this.attributeNames.has(token.value)) {
      this.reportParseError(token, 'duplicate-attribute')
    }
    this.attributeNames.add(token.value)

    this.attribute = {
      type: 'VAttribute',
      range: [token.range[0], token.range[1]],
      loc: { start: token.loc.start, end: token.loc.end },
      parent: DUMMY_PARENT,
      directive: false,
      key: {
        type: 'VIdentifier',
        range: [token.range[0], token.range[1]],
        loc: { start: token.loc.start, end: token.loc.end },
        parent: DUMMY_PARENT,
        name: token.value,
        rawName: this.text.slice(token.range[0], token.range[1]),
      },
      value: null,
    }
    this.attribute.key.parent = this.attribute

    this.currentToken.range[1] = token.range[1]
    this.currentToken.loc.end = token.loc.end
    this.currentToken.attributes.push(this.attribute)

    return null
  }

  /**
   * Process a HTMLLiteral token.
   * @param token The token to process.
   */
  protected HTMLLiteral(token: Token): IntermediateToken | null {
    this.tokens.push(token)

    if (this.attribute != null) {
      this.attribute.range[1] = token.range[1]
      this.attribute.loc.end = token.loc.end
      this.attribute.value = {
        type: 'VLiteral',
        range: [token.range[0], token.range[1]],
        loc: { start: token.loc.start, end: token.loc.end },
        parent: this.attribute,
        value: token.value,
      }

      if (
        this.currentToken == null
        || this.currentToken.type !== 'StartTag'
      ) {
        throw new Error('unreachable')
      }
      this.currentToken.range[1] = token.range[1]
      this.currentToken.loc.end = token.loc.end
    }

    return null
  }

  /**
   * Process a HTMLRCDataText token.
   * @param token The token to process.
   */
  protected HTMLRCDataText(token: Token): IntermediateToken | null {
    return this.processText(token)
  }

  /**
   * Process a HTMLRawText token.
   * @param token The token to process.
   */
  protected HTMLRawText(token: Token): IntermediateToken | null {
    return this.processText(token)
  }

  /**
   * Process a HTMLSelfClosingTagClose token.
   * @param token The token to process.
   */
  protected HTMLSelfClosingTagClose(token: Token): IntermediateToken | null {
    this.tokens.push(token)

    if (this.currentToken == null || this.currentToken.type === 'Text') {
      throw new Error('unreachable')
    }

    if (this.currentToken.type === 'StartTag') {
      this.currentToken.selfClosing = true
    }
    else {
      this.reportParseError(token, 'end-tag-with-trailing-solidus')
    }

    this.currentToken.range[1] = token.range[1]
    this.currentToken.loc.end = token.loc.end

    return this.commit()
  }

  /**
   * Process a HTMLTagClose token.
   * @param token The token to process.
   */
  protected HTMLTagClose(token: Token): IntermediateToken | null {
    this.tokens.push(token)

    if (this.currentToken == null || this.currentToken.type === 'Text') {
      throw new Error('unreachable')
    }

    this.currentToken.range[1] = token.range[1]
    this.currentToken.loc.end = token.loc.end

    return this.commit()
  }

  /**
   * Process a HTMLTagOpen token.
   * @param token The token to process.
   */
  protected HTMLTagOpen(token: Token): IntermediateToken | null {
    this.tokens.push(token)

    let result: IntermediateToken | null = null

    if (this.currentToken != null || this.expressionStartToken != null) {
      result = this.commit()
    }

    this.currentToken = {
      type: 'StartTag',
      range: [token.range[0], token.range[1]],
      loc: { start: token.loc.start, end: token.loc.end },
      name: token.value,
      rawName: this.text.slice(token.range[0] + 1, token.range[1]),
      selfClosing: false,
      attributes: [],
    }
    this.attribute = null
    this.attributeNames.clear()

    return result
  }

  /**
   * Process a HTMLText token.
   * @param token The token to process.
   */
  protected HTMLText(token: Token): IntermediateToken | null {
    return this.processText(token)
  }

  /**
   * Process a HTMLWhitespace token.
   * @param token The token to process.
   */
  protected HTMLWhitespace(token: Token): IntermediateToken | null {
    return this.processText(token)
  }

  /**
   * Process a VExpressionStart token.
   * @param token The token to process.
   */
  protected VExpressionStart(token: Token): IntermediateToken | null {
    if (this.expressionStartToken != null) {
      return this.processText(token)
    }
    const separated
            = this.currentToken != null
            && this.currentToken.range[1] !== token.range[0]
    const result = separated ? this.commit() : null

    this.tokens.push(token)
    this.expressionStartToken = token

    return result
  }

  /**
   * Process a VExpressionEnd token.
   * @param token The token to process.
   */
  protected VExpressionEnd(token: Token): IntermediateToken | null {
    if (this.expressionStartToken == null) {
      return this.processText(token)
    }

    const start = this.expressionStartToken
    const end = last(this.expressionTokens) || start

    // If it's '{{}}', it's handled as a text.
    if (token.range[0] === start.range[1]) {
      this.tokens.pop()
      this.expressionStartToken = null
      const result = this.processText(start)
      this.processText(token)
      return result
    }

    // If invalid notation `</>` exists directly before this token, separate it.
    if (end.range[1] !== token.range[0]) {
      const result = this.commit()
      this.processText(token)
      return result
    }

    // Clear state.
    const value = this.expressionTokens.reduce(concat, '')
    this.tokens.push(token)
    this.expressionStartToken = null
    this.expressionTokens = []

    // Create token.
    const result = this.currentToken != null ? this.commit() : null
    this.currentToken = {
      type: 'Mustache',
      range: [start.range[0], token.range[1]],
      loc: { start: start.loc.start, end: token.loc.end },
      value,
      startToken: start,
      endToken: token,
    }

    return result || this.commit()
  }
}
