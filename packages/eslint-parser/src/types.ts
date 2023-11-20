import type { TSESTree } from '@typescript-eslint/types'
import type { ParserOptions, parseForESLint as tsESLintParseForESLint } from '@typescript-eslint/parser'
import type { ParseError, Token } from './ast'
import type { ParserObject } from './common/parser-object'

export type VineESLintAST = TSESTree.Program
export type ParseForESLintResult = ReturnType<typeof tsESLintParseForESLint>

export interface VineESLintParserOptions extends ParserOptions {
  // ...To be extended
  parser?:
  | boolean
  | string
  | ParserObject
  | Record<string, string | ParserObject | undefined>
  ecmaFeatures?: ParserOptions['ecmaFeatures'] & {
    [key: string]: any
  }
}

export interface VineTemplatePositionInfo {
  templateStartLine: number
  templateStartColumn: number
  templateStartOffset: number
  templateEndOffset: number
  templateEndLine: number
  templateEndColumn: number
}

export interface VineTemplateMeta {
  tokens: Token[]
  comments: Token[]
  errors: ParseError[]
}
