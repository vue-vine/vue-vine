import type { ESLintExtendedProgram, ESLintProgram } from '../ast'

/**
 * The type of basic ESLint custom parser.
 * e.g. espree
 */
export interface BasicParserObject<R = ESLintProgram> {
  parse: (code: string, options: any) => R
  parseForESLint: undefined
}
/**
 * The type of ESLint custom parser enhanced for ESLint.
 * e.g. @babel/eslint-parser, @typescript-eslint/parser
 */
export interface EnhancedParserObject<R = ESLintExtendedProgram> {
  parseForESLint: (code: string, options: any) => R
  parse: undefined
}

/**
 * The type of ESLint (custom) parsers.
 */
export type ParserObject<R1 = ESLintExtendedProgram, R2 = ESLintProgram>
  = | EnhancedParserObject<R1>
    | BasicParserObject<R2>

export function isParserObject<R1, R2>(
  value: ParserObject<R1, R2> | unknown | undefined | null,
): value is ParserObject<R1, R2> {
  return isEnhancedParserObject(value) || isBasicParserObject(value)
}
export function isEnhancedParserObject<R>(
  value: EnhancedParserObject<R> | unknown | undefined | null,
): value is EnhancedParserObject<R> {
  return Boolean(value && typeof (value as any).parseForESLint === 'function')
}
export function isBasicParserObject<R>(
  value: BasicParserObject<R> | unknown | undefined | null,
): value is BasicParserObject<R> {
  return Boolean(value && typeof (value as any).parse === 'function')
}
