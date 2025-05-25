import type { ESLint, Linter } from 'eslint'
import type {
  ParseForESLintResult,
  VineESLintParserOptions,
} from './types'
import { name, version } from '../package.json'
import { runParse } from './parse'

export * from './ast'

export const meta: ESLint.ObjectMetaProperties = {
  name,
  version,
}

export function parse(
  code: string,
  parserOptions: VineESLintParserOptions,
): ParseForESLintResult['ast'] {
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

export default {
  meta,
  parse,
  parseForESLint,
} as Linter.Parser
