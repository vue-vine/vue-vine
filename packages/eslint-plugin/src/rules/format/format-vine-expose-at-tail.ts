import type { TSESTree } from '@typescript-eslint/types'
import { createEslintRule, notVineCompFn } from '../../utils'

const messageId = 'format-vine-expose-at-tail ' as const
export type MessageIds = typeof messageId
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: messageId,
  meta: {
    type: 'suggestion',
    docs: {
      category: 'format',
      description: 'Enforce `vineExpose` to be at the tail of the component function body.',
    },
    fixable: 'code',
    schema: [],
    messages: {
      [messageId]: '`vineExpose` should be at the tail of the component function body.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (
        node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
      ) => {
        if (notVineCompFn(node)) {
          return
        }
        if (node.body.type !== 'BlockStatement') {
          return
        }

        const bodyStatements = node.body.body.filter(
          stmt => stmt.type !== 'ReturnStatement',
        )

        const vineExposeIndex = bodyStatements.findIndex(
          (statement) => {
            return statement.type === 'ExpressionStatement'
              && statement.expression.type === 'CallExpression'
              && statement.expression.callee.type === 'Identifier'
              && statement.expression.callee.name === 'vineExpose'
          },
        )

        if (vineExposeIndex === -1) {
          return
        }

        if (vineExposeIndex === bodyStatements.length - 1) {
          return
        }

        context.report({
          node: bodyStatements[vineExposeIndex],
          messageId,
          fix: (fixer) => {
            const vineExposeStatement = bodyStatements[vineExposeIndex]
            const lastStatement = bodyStatements[bodyStatements.length - 1]

            // 1.Cut the `vineExpose` statement
            // 2. And append it to the end of the body
            return [
              fixer.remove(vineExposeStatement),
              fixer.insertTextAfter(
                lastStatement,
                `\n${
                  ' '.repeat(vineExposeStatement.loc.start.column)
                }${
                  context.sourceCode.getText(vineExposeStatement)
                }`,
              ),
            ]
          },
        })
      },
    }
  },
})
