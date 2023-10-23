import { simpleTraverse as traverse } from '@typescript-eslint/typescript-estree'
import { parseForESLint as tsESLintParseForESLint } from '@typescript-eslint/parser'
import type { ParseForESLintResult, VineESLintParserOptions } from './types'

export function runParse(
  code: string,
  parserOptions: VineESLintParserOptions,
): ParseForESLintResult {
  const { ast, services, scopeManager, visitorKeys } = tsESLintParseForESLint(code, parserOptions)

  // Find all tagged template expressions which are tagged with `vine`.
  traverse(ast, {
    enter(node, parent) {
      if (
        parent?.type === 'ReturnStatement'
        && node.type === 'TaggedTemplateExpression'
        && node.tag.type === 'Identifier'
        && node.tag.name === 'vine'
      ) {
        // Todo: Create our custom AST node from this Vue template string.
        // const templateNode = node

        // Delete it from the AST, because we're going to replace it with
        // our custom AST node.
        parent.argument = null
        // Also, we need to remove those tokens inside
        // this tagged template expression's range.
        ast.tokens = ast.tokens?.filter(
          token => (
            token.range[0] < node.range[0]
            || token.range[1] > node.range[1]
          ),
        )
      }
    },
  }, true)

  return {
    ast,
    services,
    scopeManager,
    visitorKeys,
  }
}
