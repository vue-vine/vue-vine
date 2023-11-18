import assert from 'node:assert'
import type { TSESTree } from '@typescript-eslint/types'
import { last } from 'lodash-es'
import { NS } from '../ast'
import type { Namespace, VAttribute, VElement, VTemplateRoot } from '../ast'
import type { VineESLintParserOptions, VineTemplateMeta, VineTemplatePositionInfo } from '../types'
import { debug } from '../common/debug'
import { LocationCalculatorForHtml } from '../common/location-calculator'
import type { IntermediateToken, StartTag } from './intermediate-tokenizer'
import { IntermediateTokenizer } from './intermediate-tokenizer'
import { HTML_CAN_BE_LEFT_OPEN_TAGS, HTML_NON_FHRASING_TAGS, SVG_ELEMENT_NAME_MAP } from './utils/tag-names'
import { modifyTokenPositionByTemplateOffset } from './process-vine-template-node'
import type { Tokenizer } from './tokenizer'
import { convertToDirective } from './utils'

const DIRECTIVE_NAME = /^(?:v-|[.:@#]).*[^.:@#]$/u
const DT_DD = /^d[dt]$/u
const DUMMY_PARENT: any = Object.freeze({})

/**
 * Set the location of the last child node to the end location of the given node.
 * @param node The node to commit the end location.
 */
function propagateEndLocation(node: VTemplateRoot | VElement): void {
  const lastChild
      = (node.type === 'VElement' ? node.endTag : null) || last(node.children)
  if (lastChild != null) {
    node.range[1] = lastChild.range[1]
    node.loc.end = lastChild.loc.end
  }
}

/**
 * Check whether the element is a MathML text integration point or not.
 * @see https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
 * @param element The current element.
 * @returns `true` if the element is a MathML text integration point.
 */
function isMathMLIntegrationPoint(element: VElement): boolean {
  if (element.namespace === NS.MathML) {
    const name = element.rawName
    return (
      name === 'mi'
          || name === 'mo'
          || name === 'mn'
          || name === 'ms'
          || name === 'mtext'
    )
  }
  return false
}

/**
 * Check whether the element is a HTML integration point or not.
 * @see https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
 * @param element The current element.
 * @returns `true` if the element is a HTML integration point.
 */
function isHTMLIntegrationPoint(element: VElement): boolean {
  if (element.namespace === NS.MathML) {
    return (
      element.rawName === 'annotation-xml'
          && element.startTag.attributes.some(
            a =>
              a.directive === false
                  && a.key.name === 'encoding'
                  && a.value != null
                  && (a.value.value === 'text/html'
                      || a.value.value === 'application/xhtml+xml'),
          )
    )
  }
  if (element.namespace === NS.SVG) {
    const name = element.rawName
    return name === 'foreignObject' || name === 'desc' || name === 'title'
  }

  return false
}

/**
 * Adjust element names by the current namespace.
 * @param name The lowercase element name to adjust.
 * @param namespace The current namespace.
 * @returns The adjusted element name.
 */
function adjustElementName(name: string, namespace: Namespace): string {
  if (namespace === NS.SVG) {
    return SVG_ELEMENT_NAME_MAP.get(name) || name
  }
  return name
}

/**
 * Vine ESLint parser for Vue template.
 *
 * This parser's responsibility is to build a `VTemplateRoot` ESTree node
 * as the representation of the Vine component's Vue template.
 */
export class VineTemplateParser {
  private baseParserOptions: VineESLintParserOptions
  private locationCalculator: LocationCalculatorForHtml
  private tokenizer: IntermediateTokenizer
  private elementStack: VElement[]
  private vPreElement: VElement | null
  private vTemplateRoot: VTemplateRoot
  private vTemplateMeta: VineTemplateMeta

  private templatePos: VineTemplatePositionInfo
  private postProcess: ((
    htmlParserOptions: VineESLintParserOptions,
    scriptParserOptions: VineESLintParserOptions
  ) => void)[] = []

  constructor(
    parserOptions: VineESLintParserOptions,
    tokenizer: Tokenizer,
    parentOfTemplate: TSESTree.Node | null,
    templatePos: VineTemplatePositionInfo,
  ) {
    this.baseParserOptions = parserOptions
    this.tokenizer = new IntermediateTokenizer(tokenizer, parserOptions)
    this.locationCalculator = new LocationCalculatorForHtml(
      tokenizer.gaps,
      tokenizer.lineTerminators,
    )
    this.elementStack = []
    this.vPreElement = null
    this.templatePos = templatePos
    this.vTemplateRoot = {
      type: 'VTemplateRoot',
      parent: parentOfTemplate,
      children: [],
      range: [
        templatePos.templateStartOffset,
        templatePos.templateEndOffset,
      ],
      loc: {
        start: {
          line: templatePos.templateStartLine,
          column: templatePos.templateStartColumn,
        },
        end: {
          line: templatePos.templateEndLine,
          column: templatePos.templateEndColumn,
        },
      },
    }
    this.vTemplateMeta = {
      tokens: this.tokenizer.tokens,
      comments: this.tokenizer.comments,
      errors: this.tokenizer.errors,
    }
  }

  private correctTokenPos(token: IntermediateToken) {
    modifyTokenPositionByTemplateOffset(
      token,
      this.templatePos,
    )
  }

  /**
   * Get the current node.
   */
  private get currentNode(): VTemplateRoot | VElement {
    return last(this.elementStack) || this.vTemplateRoot
  }

  /**
   * The source code text.
   */
  private get text(): string {
    return this.tokenizer.text
  }

  /**
   * The current namespace.
   */
  private get namespace(): Namespace {
    return this.tokenizer.namespace
  }

  private set namespace(value: Namespace) {
    this.tokenizer.namespace = value
  }

  /**
   * The current flag of expression enabled.
   */
  private get expressionEnabled(): boolean {
    return this.tokenizer.expressionEnabled
  }

  private set expressionEnabled(value: boolean) {
    this.tokenizer.expressionEnabled = value
  }

  /**
   * Check if the current location is in a v-pre element.
   */
  private get isInVPreElement(): boolean {
    return this.vPreElement != null
  }

  /**
   * Checks whether the given attribute node is need convert to directive.
   * @param node The node to check
   */
  private needConvertToDirective(node: VAttribute) {
    const attrName = node.key.rawName
    const expressionEnabled
        = this.expressionEnabled
        || (attrName === 'v-pre' && !this.isInVPreElement)

    if (!expressionEnabled) {
      return false
    }
    return (
      DIRECTIVE_NAME.test(attrName)
      || attrName === 'slot-scope'
    )
  }

  /**
   * Detect the namespace of the new element.
   * @param token The StartTag token to detect.
   * @returns The namespace of the new element.
   */
  private detectNamespace(token: StartTag): Namespace {
    const name = token.rawName
    let ns = this.namespace

    if (ns === NS.MathML || ns === NS.SVG) {
      const element = this.currentNode
      if (element.type === 'VElement') {
        if (
          element.namespace === NS.MathML
                  && element.rawName === 'annotation-xml'
                  && name === 'svg'
        ) {
          return NS.SVG
        }
        if (
          isHTMLIntegrationPoint(element)
          || (isMathMLIntegrationPoint(element)
              && name !== 'mglyph'
              && name !== 'malignmark')
        ) {
          ns = NS.HTML
        }
      }
    }

    if (ns === NS.HTML) {
      if (name === 'svg') {
        return NS.SVG
      }
      if (name === 'math') {
        return NS.MathML
      }
    }

    if (name === 'template') {
      const xmlns = token.attributes.find(a => a.key.name === 'xmlns')
      const value = xmlns && xmlns.value && xmlns.value.value

      if (value === NS.HTML || value === NS.MathML || value === NS.SVG) {
        return value
      }
    }

    return ns
  }

  /**
   * Adjust and validate the given attribute node.
   * @param node The attribute node to handle.
   * @param namespace The current namespace.
   */
  private processAttribute(node: VAttribute, namespace: Namespace): void {
    if (this.needConvertToDirective(node)) {
      this.postProcess.push(
        (
          htmlParserOptions,
          scriptParserOptions,
        ) => {
          convertToDirective(
            node,
            this.text,
            this.vTemplateMeta,
            this.locationCalculator,
            htmlParserOptions,
            scriptParserOptions,
          )
        },
      )
    }

    // node.key.name = adjustAttributeName(node.key.name, namespace)
    // const key = this.getTagName(node.key)
    // const value = node.value && node.value.value

    // if (key === 'xmlns' && value !== namespace) {
    //   this.reportParseError(node, 'x-invalid-namespace')
    // }
    // else if (key === 'xmlns:xlink' && value !== NS.XLink) {
    //   this.reportParseError(node, 'x-invalid-namespace')
    // }
  }

  /**
   * Pop an element from the current element stack.
   */
  private popElementStack(): void {
    assert(this.elementStack.length >= 1)

    const element = this.elementStack.pop()!
    propagateEndLocation(element)

    // Update the current namespace.
    const current = this.currentNode
    this.namespace
        = current.type === 'VElement' ? current.namespace : NS.HTML

    // Update v-pre state.
    if (this.vPreElement === element) {
      this.vPreElement = null
      this.expressionEnabled = true
    }

    // Update expression flag.
    if (this.elementStack.length === 0) {
      this.expressionEnabled = false
    }
  }

  /**
   * Close the current element if necessary.
   * @param token The start tag to check.
   */
  private closeCurrentElementIfNecessary(token: StartTag): void {
    const element = this.currentNode
    if (element.type !== 'VElement') {
      return
    }
    const name = token.rawName
    const elementName = element.rawName

    if (elementName === 'p' && HTML_NON_FHRASING_TAGS.has(name)) {
      this.popElementStack()
    }
    if (elementName === name && HTML_CAN_BE_LEFT_OPEN_TAGS.has(name)) {
      this.popElementStack()
    }
    if (DT_DD.test(elementName) && DT_DD.test(name)) {
      this.popElementStack()
    }
  }

  protected StartTag(token: StartTag) {
    debug('[html] StartTag %j', token)

    this.closeCurrentElementIfNecessary(token)

    const parent = this.currentNode
    const namespace = this.detectNamespace(token)
    const element: VElement = {
      type: 'VElement',
      range: [token.range[0], token.range[1]],
      loc: { start: token.loc.start, end: token.loc.end },
      parent,
      name: adjustElementName(token.name, namespace),
      rawName: token.rawName,
      namespace,
      startTag: {
        type: 'VStartTag',
        range: token.range,
        loc: token.loc,
        parent: DUMMY_PARENT,
        selfClosing: token.selfClosing,
        attributes: token.attributes,
      },
      children: [],
      endTag: null,
      variables: [],
    }
    const hasVPre
      = !this.isInVPreElement
      && token.attributes.some(a => a.key.rawName === 'v-pre')

    // Disable expression if v-pre
    if (hasVPre) {
      this.expressionEnabled = false
    }

    // Setup relations.
    parent.children.push(element)
    element.startTag.parent = element
    for (const attribute of token.attributes) {
      attribute.parent = element.startTag
      this.processAttribute(attribute, namespace)
    }
  }
}
