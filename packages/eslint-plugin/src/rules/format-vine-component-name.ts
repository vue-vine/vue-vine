import type { TSESTree } from '@typescript-eslint/types'
import { createEslintRule, notVineCompFn } from '../utils'

const RULE_NAME = 'format-vine-component-name' as const

const CONFLICT_WITH_HTML_BUILT_IN = `${RULE_NAME}-conflict-with-html-built-in`
const NOT_PASCAL_CASE = `${RULE_NAME}-not-pascal-case`

const CONFLICT_WITH_HTML_BUILT_IN_MSG = 'Vue Vine component function name must not conflict with HTML built-in tag names'
const NOT_PASCAL_CASE_MSG = 'Vue Vine component function name must be in PascalCase'

export type MessageIds =
  | typeof CONFLICT_WITH_HTML_BUILT_IN
  | typeof NOT_PASCAL_CASE
export type Options = []

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

function checkPascalCase(fnName: string) {
  return /^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/.test(fnName)
}

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce Vue Vine component function name format',
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
      [CONFLICT_WITH_HTML_BUILT_IN]: CONFLICT_WITH_HTML_BUILT_IN_MSG,
      [NOT_PASCAL_CASE]: NOT_PASCAL_CASE_MSG,
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
        const fnNameIdentifier = node.id
        if (!fnNameIdentifier || fnNameIdentifier.type !== 'Identifier') {
          return
        }

        // Check if the function name is a HTML built-in element name
        const fnName = fnNameIdentifier.name
        const isHTMLBuiltInElement = HTML_BUILT_IN_ELEMENTS.includes(fnName)
        if (isHTMLBuiltInElement) {
          context.report({
            node: fnNameIdentifier,
            messageId: CONFLICT_WITH_HTML_BUILT_IN,
          })
        }

        const isPassedPascalCase = checkPascalCase(fnName)
        if (!isPassedPascalCase) {
          context.report({
            node: fnNameIdentifier,
            messageId: NOT_PASCAL_CASE,
            fix: (fixer) => {
              const fixedName = fnName[0].toUpperCase() + fnName.slice(1)
              return fixer.replaceText(fnNameIdentifier, fixedName)
            },
          })
        }
      },
    }
  },
})
