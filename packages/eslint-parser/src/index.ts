import type {
  ParseForESLintResult,
  VineESLintParserOptions,
} from './types'
import { runParse } from './parse'

export * from './ast'

export function parse(
  code: string,
  parserOptions: VineESLintParserOptions,
) {
  return parseForESLint(code, parserOptions).ast
}

export function parseForESLint(
  code: string,
  parserOptions: VineESLintParserOptions,
): ParseForESLintResult {
  const options: VineESLintParserOptions = Object.assign(
    {
      comment: true,
      loc: true,
      range: true,
      tokens: true,
    },
    parserOptions || {},
  )

  const { ast, services, scopeManager, visitorKeys } = runParse(code, options)

  return {
    ast,
    services,
    scopeManager,
    visitorKeys,
  }
}
