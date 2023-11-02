import { parseForESLint as tsParseForESLint } from '@typescript-eslint/parser'
import type { ParseForESLintResult, VineESLintParserOptions } from './types'
import { handleVineTemplateNode, processVineTemplateNode } from './template/process-vine-template-node'

export function typescriptBasicESLintParse(
  code: string,
  parserOptions: VineESLintParserOptions,
): ParseForESLintResult {
  return tsParseForESLint(
    code,
    {
      ...parserOptions,
      range: true,
      loc: true,
    },
  )
}

export function runParse(
  code: string,
  parserOptions: VineESLintParserOptions,
): ParseForESLintResult {
  const { ast, services, scopeManager, visitorKeys } = typescriptBasicESLintParse(
    code,
    parserOptions,
  )

  const procResult = processVineTemplateNode(
    ast,
    parserOptions,
    handleVineTemplateNode,
  )
  if (procResult) {
    // Todo ...
    // const {
    //   templateStartOffset,
    //   templateEndOffset,
    //   inTemplateTokenList,
    // } = procResult
  }

  return {
    ast,
    services,
    scopeManager,
    visitorKeys,
  }
}
