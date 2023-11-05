import { TSESTree, simpleTraverse as traverse } from '@typescript-eslint/typescript-estree'
import type { ParseForESLintResult, VineESLintParserOptions } from '../types'
import type { Token } from '../ast'
import { Tokenizer } from './tokenizer'
import type { IntermediateToken } from './intermediate-tokenizer'
import { IntermediateTokenizer } from './intermediate-tokenizer'

function modifyTokenPositionByTemplateOffset<T extends Token | IntermediateToken>(
  token: T,
  templateStartLine: number,
  templateStartColumn: number,
  templateStartOffset: number,
) {
  // Because the output token position is based on the start of the template,
  // but the final expected token requires accurate offset to the source code!
  token.range[0] += templateStartOffset
  token.range[1] += templateStartOffset

  // Also, the line number should be based on the start of the template.
  // -1 is because the TSESTree's line number is 1-based.
  token.loc.start.line += templateStartLine - 1
  token.loc.end.line += templateStartLine - 1

  // For column, it's a little bit more complicated:
  // 1) If the token is at the first line, then the column number should be based on the start of the template.
  // 2) If the token is not at the first line, then the column number is what it is.
  token.loc.start.column = (
    token.loc.start.line === templateStartLine
      ? templateStartColumn + token.loc.start.column
      : token.loc.start.column
  )
  token.loc.end.column = (
    token.loc.end.line === templateStartLine
      ? templateStartColumn + token.loc.end.column
      : token.loc.end.column
  )

  return token
}

export function processVineTemplateNode<T>(
  ast: ParseForESLintResult['ast'],
  parserOptions: VineESLintParserOptions,
  handler: (
    templateNode: TSESTree.TaggedTemplateExpression,
    parentOfTemplate: TSESTree.Node | null,
    parserOptions: VineESLintParserOptions,
  ) => T,
) {
  // Find all tagged template expressions which are tagged with `vine`.
  let templateNode: TSESTree.TaggedTemplateExpression | null = null
  let parentOfTemplate: TSESTree.Node | null = null

  try {
    traverse(ast, {
      enter(node, parent) {
        if (
          node.type === 'TaggedTemplateExpression'
          && node.tag.type === 'Identifier'
          && node.tag.name === 'vine'
        ) {
          // Todo: Create our custom AST node from this Vue template string.
          templateNode = node

          // Delete it from the AST, because we're going to replace it with
          // our custom AST node.
          if (parent?.type === TSESTree.AST_NODE_TYPES.ReturnStatement) {
            parent.argument = null
          }
          // Also, we need to remove those tokens inside
          // this tagged template expression's range.
          ast.tokens = ast.tokens?.filter(
            token => (
              token.range[0] < node.range[0]
              || token.range[1] > node.range[1]
            ),
          )

          throw new Error('BREAK_TRAVERSE')
        }
      },
    }, true)
  }
  catch (err) {
    if (!(err instanceof Error) || err.message !== 'BREAK_TRAVERSE') {
      throw err
    }
  }

  if (!templateNode) {
    return
  }

  return handler(
    templateNode,
    parentOfTemplate,
    parserOptions,
  )
}

export function handleVineTemplateNode(
  templateNode: TSESTree.TaggedTemplateExpression,
  parentOfTemplate: TSESTree.Node | null,
  parserOptions: VineESLintParserOptions,
) {
  const { quasi: { quasis } } = templateNode

  // This `TemplateElement` node still contains two quotes.
  const templateRawNode = quasis[0]!
  const templateStartLine = templateRawNode.loc.start.line
  const templateStartColumn = templateRawNode.loc.start.column + 1 // +1 to move over the first quote.
  const templateStartOffset = templateRawNode.range[0] + 1
  const templateEndOffset = templateRawNode.range[1] - 1
  const templateEndLine = templateRawNode.loc.end.line
  const templateEndColumn = templateRawNode.loc.end.column - 1 // -1 to move over the last quote.
  const templateRawContent = templateRawNode.value.raw

  const baseTokenizer = new Tokenizer(templateRawContent)
  const intermediateTokenizer = new IntermediateTokenizer(baseTokenizer, parserOptions)
  const templateIntermediateTokenList: IntermediateToken[] = []

  while (true) {
    const token = intermediateTokenizer.nextToken()
    if (token == null) {
      break
    }
    templateIntermediateTokenList.push(
      modifyTokenPositionByTemplateOffset(
        token,
        templateStartLine,
        templateStartColumn,
        templateStartOffset,
      ),
    )
  }

  // After got all intermediate tokens, we need to modify basic token's position
  // for putting them back to the general AST's token list.
  const templateBasicTokenList: Token[] = intermediateTokenizer.tokens.map((token) => {
    return modifyTokenPositionByTemplateOffset(
      token,
      templateStartLine,
      templateStartColumn,
      templateStartOffset,
    )
  })
  const templateBasicCommentList = intermediateTokenizer.comments.map((comment) => {
    return modifyTokenPositionByTemplateOffset(
      comment,
      templateStartLine,
      templateStartColumn,
      templateStartOffset,
    )
  })

  return {
    templatePositionInfo: {
      templateStartLine,
      templateStartColumn,
      templateStartOffset,
      templateEndOffset,
      templateEndLine,
      templateEndColumn,
    },
    templateBasicTokenList,
    templateBasicCommentList,
    templateIntermediateTokenList,
    parentOfTemplate,
  }
}
