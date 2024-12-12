import { TSESTree } from '@typescript-eslint/types'
import { createEslintRule, notVineCompFn } from '../../utils'

const messageId = 'format-vine-macros-leading' as const
export type MessageIds = typeof messageId
export type Options = []

const VINE_MACROS = [
  'vineProp',
  'vineProp.withDefault',
  'vineProp.optional',
  'vineEmits',
  'vineSlots',
  'vineOptions',
]

function getMemberExpressionName(node: TSESTree.MemberExpression): string {
  const nameChain: string[] = []

  if (node.object.type === TSESTree.AST_NODE_TYPES.Identifier) {
    nameChain.push(node.object.name)

    if (node.property.type === TSESTree.AST_NODE_TYPES.Identifier) {
      nameChain.push(node.property.name)
    }
  }

  return nameChain.join('.')
}

export default createEslintRule<Options, MessageIds>({
  name: messageId,
  meta: {
    type: 'suggestion',
    docs: {
      category: 'format',
      description: 'Enforce all vine macros are at the leading of component function body',
    },
    fixable: 'code',
    schema: [],
    messages: {
      [messageId]: 'Move vine macro to the leading of component function body',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Find all function declarations type
      // - FunctionDeclaration
      // - FunctionExpression
      // - ArrowFunctionExpression
      // and in @vue-vine/eslint-parser we already
      // marked the component function with a flag `__isVine__: true`,
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (
        node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
      ) => {
        if (notVineCompFn(node)) {
          return
        }
        if (node.body.type !== 'BlockStatement') {
          return
        }

        const bodyStatements = node.body.body
        const nonVineMacroStatements: TSESTree.Statement[] = []

        const checkVineMacroStatementsLeading = (
          callee: TSESTree.Expression,
          statement: TSESTree.ExpressionStatement | TSESTree.VariableDeclaration,
        ) => {
          const isUnaryCallee = (
            callee.type === TSESTree.AST_NODE_TYPES.Identifier
            && VINE_MACROS.includes(callee.name)
          )
          const isMemberExprCallee = (
            callee.type === TSESTree.AST_NODE_TYPES.MemberExpression
            && VINE_MACROS.includes(getMemberExpressionName(callee))
          )
          const isVineMacro = isUnaryCallee || isMemberExprCallee
          if (!isVineMacro) {
            nonVineMacroStatements.push(statement)
          }

          if (isVineMacro && nonVineMacroStatements.length > 0) {
            context.report({
              node: statement,
              messageId,
            })
          }
        }

        // Find all call expressions that caller's name
        // or the chained name is in VINE_MACROS
        for (const statement of bodyStatements) {
          // ExpressionStatement ... CallExpression
          if (
            statement.type === TSESTree.AST_NODE_TYPES.ExpressionStatement
            && statement.expression.type === TSESTree.AST_NODE_TYPES.CallExpression
          ) {
            checkVineMacroStatementsLeading(
              statement.expression.callee,
              statement,
            )
          }
          // VariableDeclaration ... CallExpression
          else if (
            statement.type === TSESTree.AST_NODE_TYPES.VariableDeclaration
            && statement.declarations[0].init?.type === TSESTree.AST_NODE_TYPES.CallExpression
          ) {
            checkVineMacroStatementsLeading(
              statement.declarations[0].init.callee,
              statement,
            )
          }
          else {
            nonVineMacroStatements.push(statement)
          }
        }
      },
    }
  },
})
