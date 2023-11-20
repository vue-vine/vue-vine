import { TSESTree, simpleTraverse as traverse } from '@typescript-eslint/typescript-estree'
import type { ParseForESLintResult, VineTemplatePositionInfo } from '../types'
import type { Token, VTemplateRoot } from '../ast'

export function fixVineOffset<T extends Token | VTemplateRoot>(
  token: T,
  {
    templateStartOffset,
    templateStartLine,
    templateStartColumn,
  }: VineTemplatePositionInfo,
) {
  // The start position of `VTemplateRoot` is correctly set on construction.
  if (token.type !== 'VTemplateRoot') {
    // Because the output token position is based on the start of the template,
    // but the final expected token requires accurate offset to the source code!
    token.range[0] += templateStartOffset

    // Also, the line number should be based on the start of the template.
    // -1 is because the TSESTree's line number is 1-based.
    token.loc.start.line += templateStartLine - 1

    // For column, it's a little bit more complicated:
    // 1) If the token is at the first line, then the column number should be based on the start of the template.
    // 2) If the token is not at the first line, then the column number is what it is.
    token.loc.start.column = (
      token.loc.start.line === templateStartLine
        ? templateStartColumn + token.loc.start.column
        : token.loc.start.column
    )
  }

  token.range[1] += templateStartOffset
  token.loc.end.line += templateStartLine - 1
  token.loc.end.column = (
    token.loc.end.line === templateStartLine
      ? templateStartColumn + token.loc.end.column
      : token.loc.end.column
  )
}

export function extractVineTemplateNode(
  ast: ParseForESLintResult['ast'],
) {
  // Find all tagged template expressions which are tagged with `vine`.
  let templateNode: TSESTree.TaggedTemplateExpression | undefined
  let parentOfTemplate: TSESTree.Node | undefined
  let bindVineTemplateESTree: ((vineESTree: VTemplateRoot) => void) | undefined

  try {
    traverse(ast, {
      enter(node, parent) {
        if (
          node.type === 'TaggedTemplateExpression'
          && node.tag.type === 'Identifier'
          && node.tag.name === 'vine'
        ) {
          templateNode = node

          // Delete it from the AST, because we're going to replace it with
          // our custom AST node.
          if (parent?.type === TSESTree.AST_NODE_TYPES.ReturnStatement) {
            parent.argument = null
            parentOfTemplate = parent
            bindVineTemplateESTree = (vineESTree) => {
              parent.argument = vineESTree as any as TSESTree.Expression
            }
          }
          // Not only `ReturnStatement`:
          // The tagged template expression can also be a bare return value in an arrow function.
          else if (parent?.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression) {
            // @ts-expect-error `body` will be replaced by our custom AST node.
            parent.body = null
            parentOfTemplate = parent
            bindVineTemplateESTree = (vineESTree) => {
              parent.body = vineESTree as any as TSESTree.Expression
            }
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

  return {
    templateNode,
    parentOfTemplate,
    bindVineTemplateESTree,
  }
}

export function prepareTemplate(
  templateNode: TSESTree.TaggedTemplateExpression,
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

  return {
    templatePositionInfo: {
      templateStartLine,
      templateStartColumn,
      templateStartOffset,
      templateEndOffset,
      templateEndLine,
      templateEndColumn,
    },
    templateRawContent,
  }
}
