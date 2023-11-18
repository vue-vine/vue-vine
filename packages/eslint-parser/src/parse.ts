import { parseForESLint as tsParseForESLint } from '@typescript-eslint/parser'
import type { ParseForESLintResult, VineESLintParserOptions } from './types'
import { extractVineTemplateNode, prepareTemplate } from './template/process-vine-template-node'
import { Tokenizer } from './template/tokenizer'
import { VineTemplateParser } from './template/parser'

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

  const extractResult = extractVineTemplateNode(ast)
  if (extractResult) {
    const { templateNode, parentOfTemplate } = extractResult
    const { templatePositionInfo, templateRawContent } = prepareTemplate(templateNode)

    const tokenizer = new Tokenizer(templateRawContent)
    const templateParser = new VineTemplateParser(
      parserOptions,
      tokenizer,
      parentOfTemplate,
      templatePositionInfo,
    )
    // const templateRootAST = templateParser.parse()
  }

  return {
    ast,
    services,
    scopeManager,
    visitorKeys,
  }
}
