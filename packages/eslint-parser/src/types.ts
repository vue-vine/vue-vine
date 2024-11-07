import type { ParserOptions, parseForESLint as tsESLintParseForESLint } from '@typescript-eslint/parser'
import type { ESLintProgram, HasLocation, Location, OffsetRange, ParseError, Token } from './ast'
import type { ParserObject } from './common/parser-object'

export type TsESLintParseForESLint = ReturnType<typeof tsESLintParseForESLint>
export interface ParseForESLintResult {
  ast: ESLintProgram
  services: TsESLintParseForESLint['services']
  scopeManager: TsESLintParseForESLint['scopeManager']
  visitorKeys: TsESLintParseForESLint['visitorKeys']
}

export type VineESLintParserOptions = ParserOptions & {
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

export type NeedFixToken = HasLocation & { type: string }

export interface VineFixLocationContext {
  posInfo: VineTemplatePositionInfo
  fixedCache: WeakSet<Location | OffsetRange>
}

export enum ReferenceFlag {
  Read = 1,
  Write = 2,
  ReadWrite = 3,
}
export enum ReferenceTypeFlag {
  Value = 1,
  Type = 2,
}
