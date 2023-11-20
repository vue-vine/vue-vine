import { parseForESLint as tsParseForESLint } from '@typescript-eslint/parser'
import type { TSESTree } from '@typescript-eslint/types'
import type { ParseForESLintResult, VineESLintParserOptions, VineTemplateMeta } from './types'
import { extractVineTemplateNode, prepareTemplate } from './template/process-vine-template-node'
import { Tokenizer } from './template/tokenizer'
import { VineTemplateParser } from './template/parser'
import type { VTemplateRoot } from './ast'

type TemplateRootASTPreparation = ReturnType<typeof prepareTemplate> & {
  templateNode: TSESTree.TaggedTemplateExpression
  parentOfTemplate: TSESTree.Node
  bindVineTemplateESTree: (vineESTree: VTemplateRoot) => void
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

export function prepareForTemplateRootAST(
  tsFileAST: ParseForESLintResult['ast'],
): TemplateRootASTPreparation | null {
  const extractResult = extractVineTemplateNode(tsFileAST)
  if (!extractResult) {
    return null
  }

  const { templateNode, parentOfTemplate, bindVineTemplateESTree } = extractResult
  if (
    !templateNode
    || !parentOfTemplate
    || !bindVineTemplateESTree
  ) {
    return null
  }

  return {
    templateNode,
    parentOfTemplate,
    bindVineTemplateESTree,
    ...prepareTemplate(templateNode),
  }
}

export function getTemplateRootData(
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

export function finalProcessForTSFileAST(
  bindVineTemplateESTree: (vineESTree: VTemplateRoot) => void,
  templateRootAST: VTemplateRoot,
  templateMeta: VineTemplateMeta,
  tsFileAST: ParseForESLintResult['ast'],
) {
  // Put our custom ESTree node into its original place,
  // i.e. the return value of the Vine component function.
  bindVineTemplateESTree(templateRootAST)

  // Insert all tokens and comments into this TS file's root AST.
  tsFileAST.tokens = [
    ...tsFileAST.tokens ?? [],
    ...templateMeta.tokens as TSESTree.Token[],
  ].sort((a, b) => a.range[0] - b.range[0])
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
  const rootData = getTemplateRootData(
    prepareResult,
    parserOptions,
  )
  if (prepareResult && rootData) {
    const { bindVineTemplateESTree } = prepareResult
    const [templateRootAST, templateMeta] = rootData

    finalProcessForTSFileAST(
      bindVineTemplateESTree,
      templateRootAST,
      templateMeta,
      ast,
    )
  }

  return {
    ast,
    services,
    scopeManager,
    visitorKeys,
  }
}
