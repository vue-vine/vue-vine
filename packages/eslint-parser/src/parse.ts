import { parseForESLint as tsParseForESLint } from '@typescript-eslint/parser'
import type { TSESTree } from '@typescript-eslint/types'
import type { ParseForESLintResult, VineESLintParserOptions } from './types'
import { handleVineTemplateNode, processVineTemplateNode } from './template/process-vine-template-node'
import { VineESLintAnalyzer } from './template/analyzer'

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
      tokens: true,
      comment: true,
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
    const {
      templatePositionInfo,
      templateBasicTokenList,
      templateBasicCommentList,
      templateIntermediateTokenList,
      parentOfTemplate,
    } = procResult

    ast.tokens?.push(...(templateBasicTokenList as TSESTree.Token[]))
    ast.comments?.push(...(templateBasicCommentList as TSESTree.Comment[]))
    // After appending Vine template tokens, sort tokens by Token.range[0].
    ast.tokens?.sort((a, b) => a.range[0] - b.range[0])
    ast.comments?.sort((a, b) => a.range[0] - b.range[0])

    const vineTemplateESLintAnalyzer = new VineESLintAnalyzer(
      parserOptions,
      templateIntermediateTokenList,
      parentOfTemplate,
      templatePositionInfo,
    )

    // Todo ...
  }

  return {
    ast,
    services,
    scopeManager,
    visitorKeys,
  }
}
