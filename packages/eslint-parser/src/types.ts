import type { TSESTree } from '@typescript-eslint/types'
import type { ParserOptions, parseForESLint as tsESLintParseForESLint } from '@typescript-eslint/parser'

export type VineESLintAST = TSESTree.Program
export type ParseForESLintResult = ReturnType<typeof tsESLintParseForESLint>

export interface VineESLintParserOptions extends ParserOptions {
  // ...To be continued
}
