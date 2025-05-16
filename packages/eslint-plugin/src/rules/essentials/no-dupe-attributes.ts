import type { VAttribute, VDirective } from '@vue-vine/eslint-parser'
import { createEslintRule } from '../../utils'

const RULE_NAME = 'no-dupe-attributes'

export type MessageIds =
  | typeof RULE_NAME
export type Options = []

/**
 * Get the name of the given attribute node.
 * @param attribute The attribute node to get.
 * @returns The name of the attribute.
 */
function getName(attribute: VAttribute | VDirective): string | null {
  if (!attribute.directive) {
    return attribute.key.name
  }
  if (attribute.key.name.name === 'bind') {
    return (
      (attribute.key.argument
        && attribute.key.argument.type === 'VIdentifier'
        && attribute.key.argument.name)
      || null
    )
  }
  return null
}

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      category: 'essentials',
      description: 'Disallow duplication of attributes',
    },
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
      [RULE_NAME]: 'Duplicate attribute \'{{name}}\'.',
    },
  },
  defaultOptions: [],
  create(context) {
    const directiveNames = new Set<string>()
    const attributeNames = new Set<string>()

    function isDuplicate(name: string, isDirective: boolean) {
      if (
        (name === 'style')
        || (name === 'class')
      ) {
        return isDirective ? directiveNames.has(name) : attributeNames.has(name)
      }
      return directiveNames.has(name) || attributeNames.has(name)
    }

    return {
      VStartTag: () => {
        directiveNames.clear()
        attributeNames.clear()
      },
      VAttribute: (node: VAttribute) => {
        const name = getName(node)
        if (name == null) {
          return
        }

        if (isDuplicate(name, node.directive)) {
          context.report({
            // @ts-expect-error - using VineESLint node here
            node,
            loc: node.loc,
            messageId: RULE_NAME,
            data: { name },
          })
        }

        if (node.directive) {
          directiveNames.add(name)
        }
        else {
          attributeNames.add(name)
        }
      },
    }
  },
})
