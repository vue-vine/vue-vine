import type { TSESTree } from '@typescript-eslint/types'
import type { ESLintProgram, VTemplateRoot } from './ast'
import type { ParseForESLintResult, TsESLintParseForESLint, VineESLintParserOptions, VineTemplateMeta } from './types'
import { parseForESLint as tsParseForESLint } from '@typescript-eslint/parser'
import { KEYS } from './ast'
import { analyzeUsedInTemplateVariables } from './script/scope-analyzer'
import { VineTemplateParser } from './template/parser'
import { Tokenizer } from './template/tokenizer'
import { extractForVineTemplate, prepareTemplate } from './template/utils/process-vine-template-node'

type TemplateRootASTPreparation = (
  ReturnType<typeof prepareTemplate>
  & ReturnType<typeof extractForVineTemplate>[number]
)

const forceEnableLocationOptions = {
  range: true,
  loc: true,
  tokens: true,
  comment: true,
}

export function typescriptBasicESLintParse(
  code: string,
  parserOptions: VineESLintParserOptions,
): TsESLintParseForESLint {
  return tsParseForESLint(
    code,
    {
      ...parserOptions,
      ...forceEnableLocationOptions,
    },
  )
}

export function prepareForTemplateRootAST(
  tsFileAST: TsESLintParseForESLint['ast'],
): TemplateRootASTPreparation[] {
  const extractResults = extractForVineTemplate(tsFileAST)
  if (!extractResults.length) {
    return []
  }

  return extractResults.map((extractResult) => {
    const { templateNode, ...restOfExtractResult } = extractResult

    return {
      templateNode,
      ...prepareTemplate(templateNode),
      ...restOfExtractResult,
    }
  })
}

export function getTemplateRootDataList(
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
  tsFileAST: TsESLintParseForESLint['ast'],
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
  const {
    ast: tsESLintAST,
    scopeManager,
    services: tsESLintParserServices,
    visitorKeys: tsESLintVisitorKeys,
  } = typescriptBasicESLintParse(
    code,
    parserOptions,
  )

  const prepareResults = prepareForTemplateRootAST(tsESLintAST)
  for (const prepareResult of prepareResults) {
    const { bindVineTemplateESTree } = prepareResult
    const rootData = getTemplateRootDataList(
      prepareResult,
      {
        ...parserOptions,
        ...forceEnableLocationOptions,
      },
    )
    if (!rootData) {
      continue
    }
    const [templateRootAST, templateMeta] = rootData

    finalProcessForTSFileAST(
      bindVineTemplateESTree,
      templateRootAST,
      templateMeta,
      tsESLintAST,
    )

    analyzeUsedInTemplateVariables(
      scopeManager,
      templateRootAST,
    )
  }

  // Now, the ts ESLint parsed AST is been processed
  // to a Vue Vine ts AST now.
  const ast = tsESLintAST as ESLintProgram

  // Supplement Vue Vine template's visitor keys to
  // the visitor keys of TypeScript ESLint parser.
  const visitorKeys = {
    ...tsESLintVisitorKeys,
    ...KEYS,
  }

  const services = {
    ...tsESLintParserServices,
    // Todo: Maybe additional services specific to Vue Vine
  }

  return {
    ast,
    services,
    scopeManager,
    visitorKeys,
  }
}
