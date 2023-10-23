import type { TSESTree } from '@typescript-eslint/types'
import type { ScopeManager } from '@typescript-eslint/scope-manager'
import type { ParserServices } from '@typescript-eslint/typescript-estree'
import type { visitorKeys } from '@typescript-eslint/visitor-keys'
import type { ParserOptions } from '@typescript-eslint/parser'

export type VineESLintAST = TSESTree.Program

export interface ParseForESLintResult {
  ast: TSESTree.Program & {
    range?: [number, number]
    tokens?: TSESTree.Token[]
    comments?: TSESTree.Comment[]
  }
  services: ParserServices
  visitorKeys: typeof visitorKeys
  scopeManager: ScopeManager
}

export interface VineESLintParserOptions extends ParserOptions {
  // ...To be continued
}
