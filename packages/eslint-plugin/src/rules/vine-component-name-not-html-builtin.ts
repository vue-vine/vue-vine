import type { TSESTree } from '@typescript-eslint/types'
import { createEslintRule } from '../utils'

const messageId = 'vine-component-not-html-builtin' as const
export type MessageIds = typeof messageId
export type Options = []

const RULE_MSG = 'Vue Vine component function name must not be a HTML built-in element name'
const HTML_BUILT_IN_ELEMENTS: string[] = [
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'slot',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
]

export default createEslintRule<Options, string>({
  name: messageId,
  meta: {
    type: 'layout',
    docs: {
      description: RULE_MSG,
    },
    fixable: 'whitespace',
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
        additionalProperties: true,
      },
    ],
    messages: {
      [messageId]: RULE_MSG,
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression[__isVine__]': (
        node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
      ) => {
        if (!node.id || node.id.type !== 'Identifier') {
          return
        }

        // Check if the function name is a HTML built-in element name
        const fnName = node.id.name
        const isHTMLBuiltInElement = HTML_BUILT_IN_ELEMENTS.includes(fnName.toLowerCase())
        if (isHTMLBuiltInElement) {
          context.report({
            node: node.id,
            messageId,
          })
        }
      },
    }
  },
})
