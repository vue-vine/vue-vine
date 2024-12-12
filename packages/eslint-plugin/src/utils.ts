import type { RuleListener, RuleWithMeta, RuleWithMetaAndName } from '@typescript-eslint/utils/eslint-utils'
import type { RuleContext, SourceCode } from '@typescript-eslint/utils/ts-eslint'
import type { Node, VDirective, VElement } from '@vue-vine/eslint-parser'
import type { Rule } from 'eslint'
import type { VineESLintDocs } from './types'

export interface RuleModule<
  T extends readonly unknown[],
> extends Rule.RuleModule {
  defaultOptions: T
}

// @keep-sorted
const hasDocs: string[] = [
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

export function notVineCompFn(node: any) {
  return !(node as any).__isVine__
}

/**
 * Checks whether or not the tokens of two given nodes are same.
 * @param left A node 1 to compare.
 * @param right A node 2 to compare.
 * @param {ParserServices.TokenStore | SourceCode} sourceCode The ESLint source code object.
 * @returns {boolean} the source code for the given node.
 */
export function equalTokens(left: Node, right: Node, sourceCode: SourceCode) {
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
