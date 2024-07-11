import assert from 'node:assert'
import type { TSESTree } from '@typescript-eslint/types'
import findLastIndex from 'lodash/findLastIndex'
import last from 'lodash/last'
import { NS, ParseError } from '../ast'
import type { ErrorCode, HasLocation, Location, Namespace, VAttribute, VElement, VExpressionContainer, VTemplateRoot } from '../ast'
import type { VineESLintParserOptions, VineTemplateMeta, VineTemplatePositionInfo } from '../types'
import { debug } from '../common/debug'
import { LocationCalculatorForHtml } from '../common/location-calculator'
import type { EndTag, IntermediateToken, Mustache, StartTag, Text } from './intermediate-tokenizer'
import { IntermediateTokenizer } from './intermediate-tokenizer'
import { HTML_CAN_BE_LEFT_OPEN_TAGS, HTML_NON_FHRASING_TAGS, HTML_RAWTEXT_TAGS, HTML_RCDATA_TAGS, HTML_VOID_ELEMENT_TAGS, SVG_ELEMENT_NAME_MAP } from './utils/tag-names'
import { fixVineOffset } from './utils/process-vine-template-node'
import type { Tokenizer } from './tokenizer'
import { convertToDirective, processMustache, resolveReferences } from './utils'
import { MATHML_ATTRIBUTE_NAME_MAP, SVG_ATTRIBUTE_NAME_MAP } from './utils/attribute-names'

const DIRECTIVE_NAME = /^(?:v-|[.:@#]).*[^.:@#]$/u
const DT_DD = /^d[dt]$/u
const DUMMY_PARENT: any = Object.freeze({})

/**
 * Set the location of the last child node to the end location of the given node.
 * @param node The node to commit the end location.
 */
function propagateEndLocation(node: VElement): void {
  const lastChild
      = (node.type === 'VElement' ? node.endTag : null) || last(node.children)
  if (lastChild != null) {
    node.range[1] = lastChild.range[1]
    node.loc.end = lastChild.loc.end
  }
}

/**
 * Adjust attribute names by the current namespace.
 * @param name The lowercase attribute name to adjust.
 * @param namespace The current namespace.
 * @returns The adjusted attribute name.
 */
function adjustAttributeName(name: string, namespace: Namespace): string {
  if (namespace === NS.SVG) {
    return SVG_ATTRIBUTE_NAME_MAP.get(name) || name
  }
  if (namespace === NS.MathML) {
    return MATHML_ATTRIBUTE_NAME_MAP.get(name) || name
  }
  return name
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
  private postProcessForScript: ((
    parserOptions: VineESLintParserOptions
  ) => void)[] = []

  private offsetFixedTokenSet = new WeakSet<Location>()

  constructor(
    parserOptions: VineESLintParserOptions,
    tokenizer: Tokenizer,
    parentOfTemplate: TSESTree.Node,
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

    // In vue-eslint-parser, if parser goes into `<template>` tag,
    // `this.expressionEnabled` is set to true.
    this.expressionEnabled = true
  }

  get fixVineOffsetCtx() {
    return {
      posInfo: this.templatePos,
      fixedCache: this.offsetFixedTokenSet,
    }
  }

  private correctMetaTokenPos() {
    this.vTemplateMeta.tokens.forEach(token => fixVineOffset(
      token,
      this.fixVineOffsetCtx,
    ))
    this.vTemplateMeta.comments.forEach(comment => fixVineOffset(
      comment,
      this.fixVineOffsetCtx,
    ))
    fixVineOffset(this.vTemplateRoot, this.fixVineOffsetCtx)
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
   * The syntax errors which are found in this parsing.
   */
  private get errors(): ParseError[] {
    return this.tokenizer.errors
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
   * Report an invalid character error.
   * @param token Error located token
   * @param code The error code.
   */
  private reportParseError(token: HasLocation, code: ErrorCode): void {
    const error = ParseError.fromCode(
      code,
      token.range[0],
      token.loc.start.line,
      token.loc.start.column,
    )
    this.errors.push(error)

    debug('[html] syntax error:', error.message)
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
   * Pop elements from the current element stack.
   * @param index The index of the element you want to pop.
   */
  private popElementStackUntil(index: number): void {
    while (this.elementStack.length > index) {
      this.popElementStack()
    }
  }

  /**
   * Adjust and validate the given attribute node.
   * @param node The attribute node to handle.
   * @param namespace The current namespace.
   */
  private processAttribute(node: VAttribute, namespace: Namespace): void {
    if (this.needConvertToDirective(node)) {
      this.postProcessForScript.push(
        (parserOptions) => {
          convertToDirective(
            node,
            this.text,
            this.vTemplateMeta,
            this.locationCalculator,
            this.fixVineOffsetCtx,
            parserOptions,
          )
        },
      )
    }

    node.key.name = adjustAttributeName(node.key.name, namespace)
    const key = node.key.rawName
    const value = node.value && node.value.value

    if (key === 'xmlns' && value !== namespace) {
      this.reportParseError(node, 'x-invalid-namespace')
    }
    else if (key === 'xmlns:xlink' && value !== NS.XLink) {
      this.reportParseError(node, 'x-invalid-namespace')
    }
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

    // If element stack is empty, it means we're back to the template root.
    // So, we should enable expression as we do in parser constructor.
    if (this.elementStack.length === 0) {
      this.expressionEnabled = true
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

    // Resolve references.
    this.postProcessForScript.push(() => {
      for (const attribute of element.startTag.attributes) {
        if (attribute.directive) {
          if (
            attribute.key.argument != null
            && attribute.key.argument.type === 'VExpressionContainer'
          ) {
            resolveReferences(attribute.key.argument)
          }
          if (attribute.value != null) {
            resolveReferences(attribute.value)
          }
        }
      }
    })

    // Check whether the self-closing is valid.
    const isVoid
      = namespace === NS.HTML
      && HTML_VOID_ELEMENT_TAGS.has(element.rawName)
    if (token.selfClosing && !isVoid && namespace === NS.HTML) {
      this.reportParseError(
        token,
        'non-void-html-element-start-tag-with-trailing-solidus',
      )
    }

    // Vue.js supports self-closing elements even if it's not one of void elements.
    if (token.selfClosing || isVoid) {
      this.expressionEnabled = !this.isInVPreElement
      return
    }

    // Push to stack.
    this.elementStack.push(element)
    if (hasVPre) {
      assert(this.vPreElement === null)
      this.vPreElement = element
    }
    this.namespace = namespace

    // Update the content type of this element.
    this.expressionEnabled = true
    if (namespace === NS.HTML) {
      const elementName = element.rawName
      if (HTML_RCDATA_TAGS.has(elementName)) {
        this.tokenizer.state = 'RCDATA'
      }
      if (HTML_RAWTEXT_TAGS.has(elementName)) {
        this.tokenizer.state = 'RAWTEXT'
      }
    }
  }

  /**
   * Handle the end tag token.
   * @param token The token to handle.
   */
  protected EndTag(token: EndTag): void {
    debug('[html] EndTag %j', token)

    const i = findLastIndex(
      this.elementStack,
      el => el.name.toLowerCase() === token.name,
    )
    if (i === -1) {
      this.reportParseError(token, 'x-invalid-end-tag')
      return
    }

    const element = this.elementStack[i]
    element.endTag = {
      type: 'VEndTag',
      range: token.range,
      loc: token.loc,
      parent: element,
    }

    this.popElementStackUntil(i)
  }

  /**
   * Handle the text token.
   * @param token The token to handle.
   */
  protected Text(token: Text): void {
    debug('[html] Text %j', token)
    const parent = this.currentNode
    parent.children.push({
      type: 'VText',
      range: token.range,
      loc: token.loc,
      parent,
      value: token.value,
    })
  }

  /**
   * Handle the text token.
   * @param token The token to handle.
   */
  protected Mustache(token: Mustache): void {
    debug('[html] Mustache %j', token)

    const parent = this.currentNode
    const container: VExpressionContainer = {
      type: 'VExpressionContainer',
      range: token.range,
      loc: token.loc,
      parent,
      expression: null,
      references: [],
    }
    // Set relationship.
    parent.children.push(container)

    this.postProcessForScript.push((parserOptions) => {
      processMustache(
        parserOptions,
        this.locationCalculator,
        this.fixVineOffsetCtx,
        this.vTemplateMeta,
        container,
        token,
      )
      // Resolve references.
      resolveReferences(container)
    })
  }

  /**
   * Parse the HTML which was given in this constructor.
   * @returns The result of parsing.
   */
  public parse(): [VTemplateRoot, VineTemplateMeta] {
    let token: IntermediateToken | null = null

    do {
      token = this.tokenizer.nextToken()
      if (token == null) {
        break
      }
      (this as any)[token.type](token)
    } while (token != null)

    this.popElementStackUntil(0)

    const templateRoot = this.vTemplateRoot
    const templateMeta = this.vTemplateMeta

    for (const proc of this.postProcessForScript) {
      proc(this.baseParserOptions)
    }
    this.postProcessForScript = []

    // Finally, fix all token positions with vine`...` offset among this file
    this.correctMetaTokenPos()

    return [templateRoot, templateMeta]
  }
}
