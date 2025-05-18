import type { TSESTree } from '@typescript-eslint/types'
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import type { VElement } from '@vue-vine/eslint-parser'
import type { RuleModule } from '../../utils'
import { createEslintRule, isCustomComponent, isHtmlElementNode, isHtmlVoidElementName, isMathElementNode, isSvgElementNode } from '../../utils'

const messageId = 'format-html-self-closing' as const
const disallowSelfClosingMessageId = 'disallow-html-self-closing' as const
export type MessageIds =
  typeof messageId
  | typeof disallowSelfClosingMessageId

interface Option {
  html: {
    void: 'always' | 'never'
    normal: 'always' | 'never'
    component: 'always' | 'never'
  }
  svg: 'always' | 'never'
  math: 'always' | 'never'
}
export type Options = [Option]

/**
 * These strings wil be displayed in error messages.
 */
const ELEMENT_TYPE_MESSAGES = Object.freeze({
  NORMAL: 'HTML elements',
  VOID: 'HTML void elements',
  COMPONENT: 'Vue.js custom components',
  SVG: 'SVG elements',
  MATH: 'MathML elements',
  UNKNOWN: 'unknown elements',
})

interface ElementType {
  NORMAL: 'always' | 'never'
  VOID: 'always' | 'never'
  COMPONENT: 'always' | 'never'
  SVG: 'always' | 'never'
  MATH: 'always' | 'never'
  UNKNOWN: null
}

/**
 * Get the elementType of the given element.
 * @param {VElement} node The element node to get.
 * @returns {keyof Options} The elementType of the element.
 */
function getElementType(node: VElement): keyof ElementType {
  if (isCustomComponent(node)) {
    return 'COMPONENT'
  }
  if (isHtmlElementNode(node)) {
    if (isHtmlVoidElementName(node.name)) {
      return 'VOID'
    }
    return 'NORMAL'
  }
  if (isSvgElementNode(node)) {
    return 'SVG'
  }
  if (isMathElementNode(node)) {
    return 'MATH'
  }
  return 'UNKNOWN'
}

function parseOptionToMode(option: Option) {
  return {
    NORMAL: option.html.normal,
    VOID: option.html.void,
    COMPONENT: option.html.component,
    SVG: option.svg,
    MATH: option.math,
    UNKNOWN: null,
  }
}

function isEmpty(node: VElement, sourceCode: RuleContext<MessageIds, Options>['sourceCode']) {
  const start = node.startTag.range[1]
  const end = node.endTag == null ? node.range[1] : node.endTag.range[0]

  const contentBetweenTags = sourceCode.text.slice(start, end)
  return contentBetweenTags.trim() === ''
}

const rule: RuleModule<Options> = createEslintRule<Options, MessageIds>({
  name: messageId,
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce self-closing style for HTML elements and Vue components',
      category: 'format',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          html: {
            type: 'object',
            properties: {
              void: { type: 'string', enum: ['never', 'always'] },
              normal: { type: 'string', enum: ['never', 'always'] },
              component: { type: 'string', enum: ['never', 'always'] },
            },
          },
          svg: { type: 'string', enum: ['always', 'never'] },
          math: { type: 'string', enum: ['always', 'never'] },
        },
      },
    ],
    messages: {
      [messageId]: 'Require self-closing on {{elementType}} (<{{name}}>).',
      [disallowSelfClosingMessageId]: 'Disallow self-closing on {{elementType}} (<{{name}}/>).',
    },
  },
  defaultOptions: [
    {
      html: {
        void: 'never',
        normal: 'always',
        component: 'always',
      },
      svg: 'always',
      math: 'always',
    },
  ],
  create(context) {
    const sourceCode = context.sourceCode
    const options = context.options?.[0]

    return {
      VElement: (node: VElement) => {
        const elementType = getElementType(node)
        const mode = parseOptionToMode(options)[elementType]

        if (
          mode === 'always'
          && !node.startTag.selfClosing
          && isEmpty(node, sourceCode)
        ) {
          context.report({
            // @ts-expect-error - VElement is nested in TSESTree.Node
            node,
            loc: node.loc,
            messageId,
            data: {
              elementType: ELEMENT_TYPE_MESSAGES[elementType],
              name: node.rawName,
            },
            fix: (fixer) => {
              const startTag = node.startTag as any as TSESTree.Node
              const endTag = node.endTag as any as TSESTree.Node
              return [
                // Replace '>' of startTag with '/>'
                fixer.replaceText(startTag, context.sourceCode.getText(startTag).replace('>', '/>')),
                // Remove the text from the end of startTag to the end of endTag
                fixer.removeRange([startTag.range[1], endTag.range[1]]),
              ]
            },
          })
        }

        if (
          mode === 'never'
          && node.startTag.selfClosing
        ) {
          context.report({
            // @ts-expect-error - VElement is nested in TSESTree.Node
            node,
            loc: node.loc,
            messageId: disallowSelfClosingMessageId,
            data: {
              elementType: ELEMENT_TYPE_MESSAGES[elementType],
              name: node.rawName,
            },
          })
        }
      },
    }
  },
})

export default rule
