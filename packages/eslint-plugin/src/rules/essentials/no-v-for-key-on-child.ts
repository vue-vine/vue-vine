import type { VDirective, VElement } from '@vue-vine/eslint-parser'
import { createEslintRule, getDirective, hasDirective, isVElement } from '../../utils'

const RULE_NAME = 'no-v-for-key-on-child' as const

export type MessageIds = typeof RULE_NAME

/**
 * Check whether the given attribute is using the variables which are defined by `v-for` directives.
 * @param {VDirective} vFor The attribute node of `v-for` to check.
 * @param {VDirective} vBindKey The attribute node of `v-bind:key` to check.
 * @returns {boolean} `true` if the node is using the variables which are defined by `v-for` directives.
 */
function isUsingIterationVar(vFor: VDirective, vBindKey: VDirective) {
  if (vBindKey.value == null) {
    return false
  }
  const references = vBindKey.value.references
  const variables = vFor.parent.parent.variables
  return references.some(reference =>
    variables.some(
      variable =>
        variable.id.name === reference.id.name && variable.kind === 'v-for',
    ),
  )
}

export default createEslintRule<[], MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      category: 'essentials',
      description: 'Disallow the key of the <template v-for> placed on the child elements.',
    },
    schema: [],
    messages: {
      [RULE_NAME]: 'The key of the <template v-for> should be placed on the <template> tag.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      'VElement[name=\'template\'] > VStartTag > VAttribute[directive=true][key.name.name=\'for\']': (node: VDirective) => {
        const template = node.parent?.parent as VElement
        const vBindOnTemplate = getDirective(template, 'bind', 'key')
        if (vBindOnTemplate && isUsingIterationVar(node, vBindOnTemplate)) {
          return
        }

        for (const child of template.children.filter(isVElement)) {
          if (
            hasDirective(child, 'if')
            || hasDirective(child, 'else-if')
            || hasDirective(child, 'else')
            || hasDirective(child, 'for')
          ) {
            continue
          }
          const vBindKeyOnChild = getDirective(child, 'bind', 'key')
          if (vBindKeyOnChild && isUsingIterationVar(node, vBindKeyOnChild)) {
            context.report({
              node: vBindKeyOnChild as any,
              loc: vBindKeyOnChild.loc,
              messageId: RULE_NAME,
            })
          }
        }
      },
    }
  },
})
