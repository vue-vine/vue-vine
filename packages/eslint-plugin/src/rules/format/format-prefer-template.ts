import type { TSESTree } from '@typescript-eslint/types'
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import type { RuleModule } from '../../utils'
import { createEslintRule } from '../../utils'

const messageId = 'format-prefer-template' as const
const inTemplateMessageId = 'format-prefer-template-inside-vine-template' as const
export type MessageIds
  = | typeof messageId
    | typeof inTemplateMessageId
export type Options = []
type Context = RuleContext<MessageIds, Options>

function isConcatingString(node: TSESTree.BinaryExpression): boolean {
  return (
    (node.left.type === 'Literal' && typeof node.left.value === 'string')
    || (node.right.type === 'Literal' && typeof node.right.value === 'string')
    || (node.left.type === 'BinaryExpression' && isConcatingString(node.left))
    || (node.right.type === 'BinaryExpression' && isConcatingString(node.right))
  )
}

function collectParts(
  context: Context,
  node: TSESTree.Node,
): Array<{
    type: 'string' | 'expression'
    value: string
    raw?: string
  }> {
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return [
      ...collectParts(context, node.left),
      ...collectParts(context, node.right),
    ]
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return [{
      type: 'string',
      value: node.value,
      raw: context.sourceCode.getText(node),
    }]
  }

  // Check if it's a template literal
  const text = context.sourceCode.getText(node)
  if (text.startsWith('`') && text.endsWith('`')) {
    // Extract the inner part
    const inner = text.slice(1, -1)
    return [{
      type: 'string',
      value: inner,
      raw: text,
    }]
  }

  return [{
    type: 'expression',
    value: text,
  }]
}

const rule: RuleModule<Options> = createEslintRule<Options, MessageIds>({
  name: messageId,
  meta: {
    type: 'problem',
    docs: {
      category: 'format',
      description: 'Require template literals instead of string concatenation.',
    },
    fixable: 'code',
    schema: [],
    messages: {
      [messageId]: 'Unexpected string concatenation. Please use template literals.',
      [inTemplateMessageId]: 'Not recommend string concatenation in vine template. Please extract it to a variable or computed.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      'VTemplateRoot BinaryExpression': (node: TSESTree.BinaryExpression) => {
        if (node.operator !== '+' || !isConcatingString(node))
          return

        // Report error to show 'not recommend' for string concatenation in vine template
        // But don't autofix it
        context.report({
          node,
          messageId: inTemplateMessageId,
        })
      },
      'BinaryExpression:not(VTemplateRoot BinaryExpression) ': (node: TSESTree.BinaryExpression) => {
        if (
          node.operator !== '+'
          || !isConcatingString(node)
          || (node.parent as any)?._isReportedPreferTemplate
        ) {
          return
        }

        context.report({
          node,
          messageId,
          fix(fixer) {
            const parts = collectParts(context, node)
            const result = parts.map((part) => {
              if (part.type === 'string') {
                if (part.raw?.startsWith('`') && part.raw?.endsWith('`')) {
                  return part.value
                }
                return part.value
              }
              return `\${${part.value}}`
            }).join('')

            return fixer.replaceText(node, `\`${result}\``)
          },
        })
        ;(node as any)._isReportedPreferTemplate = true
      },
    }
  },
})

export default rule
