import { parseForESLint as tsParseForESLint } from '@typescript-eslint/parser'
import type { TSESTree } from '@typescript-eslint/types'
import type { ParseForESLintResult, VineESLintParserOptions } from './types'
import { extractVineTemplateNode, prepareTemplate } from './template/process-vine-template-node'
import { Tokenizer } from './template/tokenizer'
import { VineTemplateParser } from './template/parser'

type TemplateRootASTPreparation = ReturnType<typeof prepareTemplate> & {
  templateNode: TSESTree.TaggedTemplateExpression
  parentOfTemplate: TSESTree.Node
}

export function prepareForTemplateRootAST(
  tsFileAST: ParseForESLintResult['ast'],
): TemplateRootASTPreparation | null {
  const extractResult = extractVineTemplateNode(tsFileAST)
  if (!extractResult) {
    return null
  }

  const { templateNode, parentOfTemplate } = extractResult
  if (!templateNode || !parentOfTemplate) {
    return null
  }

  return {
    templateNode,
    parentOfTemplate,
    ...prepareTemplate(templateNode),
  }
}

export function getTemplateRootAST(
  prepareResult: TemplateRootASTPreparation | null,
  parserOptions: VineESLintParserOptions,
) {
  if (!prepareResult) {
    return null
  }
  const { parentOfTemplate, templatePositionInfo, templateRawContent } = prepareResult

  const tokenizer = new Tokenizer(templateRawContent)
  const templateParser = new VineTemplateParser(
    parserOptions,
    tokenizer,
    parentOfTemplate,
    templatePositionInfo,
  )
  return templateParser.parse()
}

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

  const prepareResult = prepareForTemplateRootAST(ast)
  const templateRootAST = getTemplateRootAST(
    prepareResult,
    parserOptions,
  )
  // Todo ...

  return {
    ast,
    services,
    scopeManager,
    visitorKeys,
  }
}
