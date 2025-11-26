import type { TSESTree } from '@typescript-eslint/types'
import type { RuleModule } from '../../utils'
import { AST_NODE_TYPES } from '@typescript-eslint/types'
import { createEslintRule, notVineCompFn } from '../../utils'

const RULE_NAME = 'format-vine-emits-camel-case' as const
const MESSAGE_ID = 'preferCamelCase' as const
const CASE_REGEXP = /^[a-z][a-z0-9]*$/i

export type MessageIds = typeof MESSAGE_ID
export type Options = []

/**
 * Check if a string is in camelCase or PascalCase format.
 * camelCase: starts with lowercase letter, e.g., 'clickTest', 'onChange'
 * PascalCase: starts with uppercase letter, e.g., 'ClickTest', 'OnChange'
 */
function isCamelOrPascalCase(str: string): boolean {
  // camelCase or PascalCase: starts with letter, followed by letters/numbers only
  // e.g., 'clickTest', 'onChange', 'ClickTest', 'OnChange' are valid
  // e.g., 'click-test', 'click_test' are NOT valid
  return CASE_REGEXP.test(str)
}

const rule: RuleModule<Options> = createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      category: 'format',
      description: 'Recommend using camelCase for vineEmits event names to improve language service support',
    },
    schema: [],
    messages: {
      [MESSAGE_ID]: 'Event name "{{eventName}}" should be camelCase (e.g., "{{suggestedName}}") for better language service linking and navigation support.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Target function declarations that are Vine component functions
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (
        node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
      ) => {
        if (
          notVineCompFn(node)
          || node.body.type !== AST_NODE_TYPES.BlockStatement
        ) {
          return
        }

        const bodyStatements = node.body.body

        for (const statement of bodyStatements) {
          // Handle: const emits = vineEmits<{ ... }>()
          if (
            statement.type === AST_NODE_TYPES.VariableDeclaration
            && statement.declarations[0]?.init?.type === AST_NODE_TYPES.CallExpression
          ) {
            checkVineEmitsCall(statement.declarations[0].init)
          }
          // Handle: vineEmits<{ ... }>()
          else if (
            statement.type === AST_NODE_TYPES.ExpressionStatement
            && statement.expression.type === AST_NODE_TYPES.CallExpression
          ) {
            checkVineEmitsCall(statement.expression)
          }
        }

        function checkVineEmitsCall(callExpr: TSESTree.CallExpression) {
          // Check if callee is 'vineEmits'
          if (
            callExpr.callee.type !== AST_NODE_TYPES.Identifier
            || callExpr.callee.name !== 'vineEmits'
          ) {
            return
          }

          // Check for type parameters: vineEmits<{ eventName: [...] }>()
          const typeParams = callExpr.typeArguments
          if (!typeParams || typeParams.params.length === 0) {
            return
          }

          const typeArg = typeParams.params[0]

          // The type argument should be a TSTypeLiteral (object type)
          if (typeArg.type !== AST_NODE_TYPES.TSTypeLiteral) {
            return
          }

          // Check each property in the type literal
          for (const member of typeArg.members) {
            if (member.type !== AST_NODE_TYPES.TSPropertySignature) {
              continue
            }

            let eventName: string | null = null
            let keyNode: TSESTree.Node = member.key

            // Get the event name from the property key
            if (member.key.type === AST_NODE_TYPES.Identifier) {
              eventName = member.key.name
            }
            else if (
              member.key.type === AST_NODE_TYPES.Literal
              && typeof member.key.value === 'string'
            ) {
              eventName = member.key.value
              keyNode = member.key
            }

            if (eventName && !isCamelOrPascalCase(eventName)) {
              context.report({
                node: keyNode,
                messageId: MESSAGE_ID,
                data: {
                  eventName,
                  suggestedName: toCamelCase(eventName),
                },
              })
            }
          }
        }
      },
    }
  },
})

/**
 * Convert a string to camelCase format.
 * Handles kebab-case, snake_case, and PascalCase.
 */
function toCamelCase(str: string): string {
  // Handle kebab-case and snake_case
  if (str.includes('-') || str.includes('_')) {
    return str
      .split(/[-_]/)
      .map((part, index) =>
        index === 0
          ? part.toLowerCase()
          : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
      )
      .join('')
  }

  // Handle PascalCase -> camelCase
  if (/^[A-Z]/.test(str)) {
    return str.charAt(0).toLowerCase() + str.slice(1)
  }

  return str
}

export default rule
