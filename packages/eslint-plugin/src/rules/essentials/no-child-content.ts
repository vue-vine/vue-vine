import type { VDirective, Node as VineESLintNode } from '@vue-vine/eslint-parser'
import { createEslintRule } from '../../utils'

const RULE_NAME = 'no-child-content'
const SUGGEST_REMOVE_CHILD_CONTENT = 'remove-child-content'
const DEFAULT_CATCH_NAMES = ['html', 'text']

export type MessageIds =
  | typeof RULE_NAME
  | typeof SUGGEST_REMOVE_CHILD_CONTENT
export type Options = [{
  directives: string[]
}]

function isWhiteSpaceTextNode(node: VineESLintNode) {
  return node.type === 'VText' && node.value.trim() === ''
}

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'layout',
    docs: {
      category: 'essentials',
      description: 'Disallow element\'s child contents which would be overwritten by a directive like v-html or v-text',
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          directives: {
            type: 'string',
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      [RULE_NAME]: 'Child content is disallowed because it will be overwritten by directive v-{{ directiveName }}',
      [SUGGEST_REMOVE_CHILD_CONTENT]: 'Remove child content',
    },
  },
  defaultOptions: [{
    directives: [],
  }],
  create(context) {
    return {
      'VAttribute[directive=true]': (attrNode: VDirective) => {
        const { directives = [] } = context.options?.[0] ?? {}
        const catchNames = [...new Set(DEFAULT_CATCH_NAMES.concat(directives))]

        const directiveName = attrNode.key.name.name
        if (!catchNames.includes(directiveName)) {
          return
        }

        const vElementNode = attrNode.parent.parent
        const hasChildContent = vElementNode.children.length > 0
        if (!hasChildContent) {
          return
        }
        const notEmptyChildContents = vElementNode.children.filter(
          node => !isWhiteSpaceTextNode(node),
        )
        if (notEmptyChildContents.length === 0) {
          return
        }

        notEmptyChildContents.forEach((node) => {
          context.report({
            // @ts-expect-error - using VineESLintNode
            node,
            messageId: RULE_NAME,
            data: {
              directiveName,
            },
            suggest: [
              {
                messageId: SUGGEST_REMOVE_CHILD_CONTENT,
                fix: (fixer) => {
                  // @ts-expect-error - using VineESLintNode
                  return fixer.remove(node)
                },
              },
            ],
          })
        })
      },
    }
  },
})
