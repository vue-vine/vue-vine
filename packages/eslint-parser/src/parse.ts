import { parseForESLint as tsParseForESLint } from '@typescript-eslint/parser'
import type { TSESTree } from '@typescript-eslint/types'
import type { ParseForESLintResult, VineESLintParserOptions, VineTemplateMeta } from './types'
import { extractForVineTemplate, prepareTemplate } from './template/utils/process-vine-template-node'
import { Tokenizer } from './template/tokenizer'
import { VineTemplateParser } from './template/parser'
import { KEYS, type VTemplateRoot } from './ast'
import { analyzeUsedInTemplateVariables } from './script/scope-analyzer'

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
): ParseForESLintResult {
  return tsParseForESLint(
    code,
    {
      ...parserOptions,
      ...forceEnableLocationOptions,
    },
  )
}

export function prepareForTemplateRootAST(
  tsFileAST: ParseForESLintResult['ast'],
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
  const { ast, services, scopeManager, visitorKeys: tsESLintVisitorKeys } = typescriptBasicESLintParse(
    code,
    parserOptions,
  )

  const prepareResults = prepareForTemplateRootAST(ast)
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
      ast,
    )

    analyzeUsedInTemplateVariables(
      scopeManager,
      templateRootAST,
    )
  }

  // Supplement Vue Vine template's visitor keys to
  // the visitor keys of TypeScript ESLint parser.
  const visitorKeys = {
    ...tsESLintVisitorKeys,
    ...KEYS,
  }

  return {
    ast,
    services,
    scopeManager,
    visitorKeys,
  }
}
