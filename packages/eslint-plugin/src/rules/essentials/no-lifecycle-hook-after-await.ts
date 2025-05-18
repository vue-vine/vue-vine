import type { TSESTree } from '@typescript-eslint/types'
import type { RuleModule } from '../../utils'
import { createEslintRule, notVineCompFn } from '../../utils'

const RULE_NAME = 'no-lifecycle-hook-after-await' as const

export type MessageIds = typeof RULE_NAME

// List of lifecycle hook names
const LIFECYCLE_HOOKS = [
  'onMounted',
  'onBeforeMount',
  'onUnmounted',
  'onBeforeUnmount',
  'onActivated',
  'onDeactivated',
  'onErrorCaptured',
  'onRenderTracked',
  'onRenderTriggered',
  'onBeforeUpdate',
  'onUpdated',
  'onServerPrefetch',
]

const rule: RuleModule<[]> = createEslintRule<[], MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      category: 'essentials',
      description: 'Disallow lifecycle hooks after await expression',
    },
    schema: [],
    messages: {
      [RULE_NAME]: 'Lifecycle hooks should be registered synchronously before await expressions.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      'FunctionDeclaration[async=true], ArrowFunctionExpression[async=true], FunctionExpression[async=true]': (
        node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
      ) => {
        if (
          notVineCompFn(node)
          || node.body.type !== 'BlockStatement'
        ) {
          return
        }

        let awaitFound = false
        const lifecycleHooksAfterAwait: TSESTree.CallExpression[] = []

        // Recursively check the statements in the function body
        function checkNode(node: any) {
          if (!node)
            return

          // Check if it is an await expression
          if (node.type === 'AwaitExpression') {
            awaitFound = true
            return
          }

          // Check if it is a lifecycle hook call
          if (
            awaitFound
            && node.type === 'CallExpression'
            && node.callee.type === 'Identifier'
            && LIFECYCLE_HOOKS.includes(node.callee.name)
          ) {
            lifecycleHooksAfterAwait.push(node)
            return
          }

          // Recursively check the child nodes
          if (node.body && Array.isArray(node.body)) {
            node.body.forEach(checkNode)
          }
          else if (node.body) {
            checkNode(node.body)
          }

          // Check other properties that may contain child nodes
          if (node.consequent)
            checkNode(node.consequent)
          if (node.alternate)
            checkNode(node.alternate)
          if (node.expression)
            checkNode(node.expression)
        }

        // Check the function body
        checkNode(node.body)

        // Report the lifecycle hooks found after await
        lifecycleHooksAfterAwait.forEach((hook) => {
          context.report({
            node: hook as any,
            loc: hook.loc,
            messageId: RULE_NAME,
          })
        })
      },
    }
  },
})

export default rule
