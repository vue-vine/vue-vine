import type { TSESTree } from '@typescript-eslint/types'
import type { VElement, VTemplateRoot } from '../ast'
import type { VineESLintParserOptions, VineTemplatePositionInfo } from '../types'
import type { IntermediateToken } from './intermediate-tokenizer'

/**
 * Vine ESLint parser for Vue template.
 *
 * This parser's responsibility is to build a `VTemplateRoot` ESTree node
 * as the representation of the Vine component's Vue template.
 */
export class VineESLintAnalyzer {
  private baseParserOptions: VineESLintParserOptions
  private intermediateTokenList: IntermediateToken[]
  private elementStack: VElement[]
  private vPreElement: VElement | null
  private vTemplateRoot: VTemplateRoot

  constructor(
    parserOptions: VineESLintParserOptions,
    intermediateTokenList: IntermediateToken[],
    parentOfTemplate: TSESTree.Node | null,
    templatePos: VineTemplatePositionInfo,
  ) {
    this.baseParserOptions = parserOptions
    this.intermediateTokenList = intermediateTokenList
    this.elementStack = []
    this.vPreElement = null
    this.vTemplateRoot = {
      type: 'VTemplateRoot',
      parent: parentOfTemplate,
      children: [],
      range: [
        templatePos.templateStartOffset,
        templatePos.templateEndOffset,
      ],
      loc: {
        start: {
          line: templatePos.templateStartLine,
          column: templatePos.templateStartColumn,
        },
        end: {
          line: templatePos.templateEndLine,
          column: templatePos.templateEndColumn,
        },
      },
    }
  }
}
