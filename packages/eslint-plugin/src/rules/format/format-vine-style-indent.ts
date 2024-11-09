import { unindent } from '@antfu/utils'
import { createEslintRule } from '../../utils'

const messageId = 'format-vine-style-indent' as const
export type MessageIds = typeof messageId
export type Options = [{
  indent?: number
}]

const VINE_STYLE_TAGS = [
  'css',
  'scss',
  'sass',
  'less',
  'stylus',
  'postcss',
]

export default createEslintRule<Options, MessageIds>({
  name: messageId,
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce prettier indentation for template string in vineStyle',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          indent: {
            type: 'number',
            minimum: 0,
            default: 2,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      [messageId]: 'Indent incorrectly formatted vineStyle template string',
    },
  },
  defaultOptions: [{ indent: 2 }],
  create(context) {
    const { indent = 2 } = context.options?.[0] ?? {}
    return {
      TaggedTemplateExpression(node) {
        const id = node.tag
        if (!id || id.type !== 'Identifier')
          return
        if (!VINE_STYLE_TAGS.includes(id.name))
          return
        if (node.quasi.quasis.length !== 1)
          return
        const quasi = node.quasi.quasis[0]
        const value = quasi.value.raw
        const lineStartIndex = context.sourceCode.getIndexFromLoc({
          line: node.loc.start.line,
          column: 0,
        })
        const baseIndent = context.sourceCode.text.slice(lineStartIndex).match(/^\s*/)?.[0] ?? ''
        const targetIndent = baseIndent + ' '.repeat(indent)
        const pure = unindent(value)
        let final = pure
          .split('\n')
          .map(line => targetIndent + line)
          .join('\n')

        final = `\n${final}\n${baseIndent}`

        if (final !== value) {
          context.report({
            messageId,
            node: quasi,
            fix: fixer => fixer.replaceText(quasi, `\`${final}\``),
          })
        }
      },
    }
  },
})
