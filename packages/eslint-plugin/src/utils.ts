import type { RuleListener, RuleWithMeta, RuleWithMetaAndName } from '@typescript-eslint/utils/eslint-utils'
import type { RuleContext, SourceCode } from '@typescript-eslint/utils/ts-eslint'
import type { Node, VAttribute, VDirective, VElement } from '@vue-vine/eslint-parser'
import type { Rule } from 'eslint'
import type { VineESLintDocs } from './types'
import { NS } from '@vue-vine/eslint-parser'
import HTML_ELEMENTS from './data/html-elements.json'
import MATH_ELEMENTS from './data/math-elements.json'
import SVG_ELEMENTS from './data/svg-elements.json'
import VOID_ELEMENTS from './data/void-elements.json'

export interface RuleModule<
  T extends readonly unknown[],
> extends Rule.RuleModule {
  defaultOptions: T
}

// @keep-sorted
const hasDocs: string[] = [
  'format-prefer-template',
  'format-vine-component-name',
  'format-vine-macros-leading',
  'format-vine-style-indent',
  'no-child-content',
  'no-dupe-attributes',
  'no-dupe-else-if',
]

const blobUrl = 'https://github.com/vue-vine/vue-vine/blob/main/packages/eslint-plugin/src/rules'

/**
 * Creates reusable function to create rules with default options and docs URLs.
 *
 * @param urlCreator Creates a documentation URL for a given rule name.
 * @returns Function to create a rule with the docs URL format.
 */
function RuleCreator(urlCreator: (name: string, category: string) => string) {
  // This function will get much easier to call when this is merged https://github.com/Microsoft/TypeScript/pull/26349
  // TODO - when the above PR lands; add type checking for the context.report `data` property
  return function createNamedRule<
    TOptions extends readonly unknown[],
    TMessageIds extends string,
    TDocs extends VineESLintDocs = VineESLintDocs,
  >({
    name,
    meta,
    ...rule
  }: Readonly<RuleWithMetaAndName<TOptions, TMessageIds, TDocs>>): RuleModule<TOptions> {
    return createRule<TOptions, TMessageIds>({
      meta: {
        ...meta,
        docs: {
          ...meta.docs,
          url: urlCreator(name, meta.docs.category),
        },
      },
      ...rule,
    })
  }
}

/**
 * Creates a well-typed TSESLint custom ESLint rule without a docs URL.
 *
 * @returns Well-typed TSESLint custom ESLint rule.
 * @remarks It is generally better to provide a docs URL function to RuleCreator.
 */
function createRule<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
>({
  create,
  defaultOptions,
  meta,
}: Readonly<RuleWithMeta<TOptions, TMessageIds>>): RuleModule<TOptions> {
  return {
    create: ((
      context: Readonly<RuleContext<TMessageIds, TOptions>>,
    ): RuleListener => {
      const optionsWithDefault = context.options.map((options, index) => {
        return {
          ...defaultOptions[index] || {},
          ...options || {},
        }
      }) as unknown as TOptions
      return create(context, optionsWithDefault)
    }) as any,
    defaultOptions,
    meta: meta as any,
  }
}

export const createEslintRule = RuleCreator(
  (ruleName, category) => hasDocs.includes(ruleName)
    ? `${blobUrl}/${category}/${ruleName}.md`
    : `${blobUrl}/${category}/${ruleName}.ts`,
) as any as <
  TOptions extends readonly unknown[],
  TMessageIds extends string,
  TDocs extends VineESLintDocs = VineESLintDocs,
>(
  { name, meta, ...rule }: Readonly<RuleWithMetaAndName<TOptions, TMessageIds, TDocs>>
) => RuleModule<TOptions>

export function notVineCompFn(node: any): boolean {
  return !(node as any).__isVine__
}

/**
 * Checks whether or not the tokens of two given nodes are same.
 * @param left A node 1 to compare.
 * @param right A node 2 to compare.
 * @param {ParserServices.TokenStore | SourceCode} sourceCode The ESLint source code object.
 * @returns {boolean} the source code for the given node.
 */
export function equalTokens(left: Node, right: Node, sourceCode: SourceCode): boolean {
  const tokensL = sourceCode.getTokens(left as any)
  const tokensR = sourceCode.getTokens(right as any)

  if (tokensL.length !== tokensR.length) {
    return false
  }

  return tokensL.every(
    (token, i) =>
      token.type === tokensR[i].type && token.value === tokensR[i].value,
  )
}

/**
 * Get the previous sibling element of the given element.
 * @param node The element node to get the previous sibling element.
 * @returns The previous sibling element.
 */
export function prevSibling(node: VElement): VElement | null {
  let prevElement = null

  for (const siblingNode of (node.parent && node.parent.children) || []) {
    if (siblingNode === node) {
      return prevElement
    }
    if (siblingNode.type === 'VElement') {
      prevElement = siblingNode
    }
  }

  return null
}

/**
 * Get the directive which has the given name.
 * @param node The start tag node to check.
 * @param name The directive name to check.
 * @param argument The directive argument to check.
 * @returns The found directive.
 */
export function getDirective(node: VElement, name: string, argument?: string): VDirective | null {
  return (
    node.startTag.attributes.find(
      (node): node is VDirective =>
        node.directive
        && node.key.name.name === name
        && (argument === undefined
          || (node.key.argument
            && node.key.argument.type === 'VIdentifier'
            && node.key.argument.name) === argument),
    ) || null
  )
}

/* Checks whether the given node is VElement. */
export function isVElement(node: Node): node is VElement {
  return node.type === 'VElement'
}

function hasAttribute(node: VElement, name: string, value?: string): boolean {
  return Boolean(getAttribute(node, name, value))
}

/* Check whether the given start tag has specific directive. */
export function hasDirective(node: VElement, name: string, argument?: string): boolean {
  return Boolean(getDirective(node, name, argument))
}

/**
 * Get the attribute which has the given name.
 */
function getAttribute(node: VElement, name: string, value?: string): VAttribute | null {
  return (
    node.startTag.attributes.find(
      (node): node is VAttribute =>
        !node.directive
        && node.key.name === name
        && (value === undefined
          || (node.value != null && node.value.value === value)),
    ) || null
  )
}

export function isHtmlElementNode(node: VElement): boolean {
  return node.namespace === NS.HTML
}

export function isSvgElementNode(node: VElement): boolean {
  return node.namespace === NS.SVG
}

export function isMathElementNode(node: VElement): boolean {
  return node.namespace === NS.MathML
}

export function isHtmlVoidElementName(name: string): boolean {
  return VOID_ELEMENTS.includes(name)
}

function isHtmlWellKnownElementName(name: string): boolean {
  return HTML_ELEMENTS.includes(name)
}
function isSvgWellKnownElementName(name: string): boolean {
  return SVG_ELEMENTS.includes(name)
}
function isMathWellKnownElementName(name: string): boolean {
  return MATH_ELEMENTS.includes(name)
}
export function isCustomComponent(node: VElement, ignoreElementNamespaces = false): boolean {
  if (
    hasAttribute(node, 'is')
    || hasDirective(node, 'bind', 'is')
    || hasDirective(node, 'is')
  ) {
    return true
  }

  const isHtmlName = isHtmlWellKnownElementName(node.rawName)
  const isSvgName = isSvgWellKnownElementName(node.rawName)
  const isMathName = isMathWellKnownElementName(node.rawName)

  if (ignoreElementNamespaces) {
    return !isHtmlName && !isSvgName && !isMathName
  }

  return (
    (isHtmlElementNode(node) && !isHtmlName)
    || (isSvgElementNode(node) && !isSvgName)
    || (isMathElementNode(node) && !isMathName)
  )
}

export function checkPascalCase(fnName: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(fnName)
}
