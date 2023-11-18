import { debug } from '../../common/debug'
import type { VineESLintParserOptions, VineTemplateMeta } from '../../types'
import type { LocationCalculatorForHtml } from '../../common/location-calculator'
import { ParseError } from '../../ast'
import type { Token, VAttribute, VDirective, VDirectiveKey, VIdentifier } from '../../ast'
import { insertError } from '../../common/error-utils'
import { createSimpleToken, insertComments, replaceTokens } from '../../common/token-utils'
import { parseAttributeValue, parseExpression } from '../../script'

const shorthandSign = /^[.:@#]/u
const shorthandNameMap = { ':': 'bind', '.': 'bind', '@': 'on', '#': 'slot' }
const invalidDynamicArgumentNextChar = /^[\s\r\n=/>]$/u

/**
 * Check whether a given identifier node is `prop` or not.
 * @param node The identifier node to check.
 */
function isPropModifier(node: VIdentifier): boolean {
  return node.name === 'prop'
}

/**
 * Check whether a given identifier node is empty or not.
 * @param node The identifier node to check.
 */
function isNotEmptyModifier(node: VIdentifier): boolean {
  return node.name !== ''
}

/**
 * Parse the given attribute name as a directive key.
 * @param node The identifier node to parse.
 * @param templateMeta template tokens, comments and errors.
 * @returns The directive key node.
 */
function parseDirectiveKeyStatically(
  node: VIdentifier,
  templateMeta: VineTemplateMeta,
): VDirectiveKey {
  const {
    name: text,
    rawName: rawText,
    range: [offset],
    loc: {
      start: { column, line },
    },
  } = node
  const directiveKey: VDirectiveKey = {
    type: 'VDirectiveKey',
    range: node.range,
    loc: node.loc,
    parent: node.parent as any,
    name: null as any,
    argument: null as VIdentifier | null,
    modifiers: [] as VIdentifier[],
  }
  let i = 0

  function createIdentifier(
    start: number,
    end: number,
    name?: string,
  ): VIdentifier {
    return {
      type: 'VIdentifier',
      parent: directiveKey,
      range: [offset + start, offset + end],
      loc: {
        start: { column: column + start, line },
        end: { column: column + end, line },
      },
      name: name || text.slice(start, end),
      rawName: rawText.slice(start, end),
    }
  }

  // Parse.
  if (shorthandSign.test(text)) {
    const sign = text[0] as ':' | '.' | '@' | '#'
    directiveKey.name = createIdentifier(0, 1, shorthandNameMap[sign])
    i = 1
  }
  else {
    const colon = text.indexOf(':')
    if (colon !== -1) {
      directiveKey.name = createIdentifier(0, colon)
      i = colon + 1
    }
  }

  if (directiveKey.name != null && text[i] === '[') {
    // Dynamic argument.
    const len = text.slice(i).lastIndexOf(']')
    if (len !== -1) {
      directiveKey.argument = createIdentifier(i, i + len + 1)
      i = i + len + 1 + (text[i + len + 1] === '.' ? 1 : 0)
    }
  }

  const modifiers = text
    .slice(i)
    .split('.')
    .map((modifierName) => {
      const modifier = createIdentifier(i, i + modifierName.length)
      if (modifierName === '' && i < text.length) {
        insertError(
          templateMeta,
          new ParseError(
            `Unexpected token '${text[i]}'`,
            undefined,
            offset + i,
            line,
            column + i,
          ),
        )
      }
      i += modifierName.length + 1
      return modifier
    })

  if (directiveKey.name == null) {
    directiveKey.name = modifiers.shift()!
  }
  else if (directiveKey.argument == null && modifiers[0].name !== '') {
    directiveKey.argument = modifiers.shift() || null
  }
  directiveKey.modifiers = modifiers.filter(isNotEmptyModifier)

  if (directiveKey.name.name === 'v-') {
    insertError(
      templateMeta,
      new ParseError(
        `Unexpected token '${
            text[directiveKey.name.range[1] - offset]
        }'`,
        undefined,
        directiveKey.name.range[1],
        directiveKey.name.loc.end.line,
        directiveKey.name.loc.end.column,
      ),
    )
  }

  // v-bind.prop shorthand
  if (
    directiveKey.name.rawName === '.'
      && !directiveKey.modifiers.some(isPropModifier)
  ) {
    const pos
          = (directiveKey.argument || directiveKey.name).range[1] - offset
    const propModifier = createIdentifier(pos, pos, 'prop')
    directiveKey.modifiers.unshift(propModifier)
  }

  return directiveKey
}

/**
 * Parse the tokens of a given key node.
 * @param node The key node to parse.
 */
function parseDirectiveKeyTokens(node: VDirectiveKey): Token[] {
  const { name, argument, modifiers } = node
  const shorthand = name.range[1] - name.range[0] === 1
  const tokens: Token[] = []

  if (shorthand) {
    tokens.push({
      type: 'Punctuator',
      range: name.range,
      loc: name.loc,
      value: name.rawName,
    })
  }
  else {
    tokens.push({
      type: 'HTMLIdentifier',
      range: name.range,
      loc: name.loc,
      value: name.rawName,
    })

    if (argument) {
      tokens.push({
        type: 'Punctuator',
        range: [name.range[1], argument.range[0]],
        loc: { start: name.loc.end, end: argument.loc.start },
        value: ':',
      })
    }
  }

  if (argument) {
    tokens.push({
      type: 'HTMLIdentifier',
      range: argument.range,
      loc: argument.loc,
      value: (argument as VIdentifier).rawName,
    })
  }

  let lastNode = (argument as VIdentifier | null) || name
  for (const modifier of modifiers) {
    if (modifier.rawName === '') {
      continue
    }

    tokens.push(
      {
        type: 'Punctuator',
        range: [lastNode.range[1], modifier.range[0]],
        loc: { start: lastNode.loc.end, end: modifier.loc.start },
        value: '.',
      },
      {
        type: 'HTMLIdentifier',
        range: modifier.range,
        loc: modifier.loc,
        value: modifier.rawName,
      },
    )
    lastNode = modifier
  }

  return tokens
}

/**
 * Convert `node.argument` property to a `VExpressionContainer` node if it's a dynamic argument.
 * @param node The directive key node to convert.
 * @param templateMeta The belonging templateMeta node.
 * @param parserOptions The parser options to parse.
 * @param locationCalculator The location calculator to parse.
 */
function convertDynamicArgument(
  node: VDirectiveKey,
  templateMeta: VineTemplateMeta,
  parserOptions: VineESLintParserOptions,
  locationCalculator: LocationCalculatorForHtml,
): void {
  const { argument } = node
  if (
    !(
      argument != null
          && argument.type === 'VIdentifier'
          && argument.name.startsWith('[')
          && argument.name.endsWith(']')
    )
  ) {
    return
  }

  const { rawName, range, loc } = argument
  try {
    const { comments, expression, references, tokens } = parseExpression(
      rawName.slice(1, -1),
      locationCalculator.getSubCalculatorAfter(range[0] + 1),
      parserOptions,
    )

    node.argument = {
      type: 'VExpressionContainer',
      range,
      loc,
      parent: node,
      expression,
      references,
    }

    if (expression != null) {
      expression.parent = node.argument
    }

    // Add tokens of `[` and `]`.
    tokens.unshift(
      createSimpleToken(
        'Punctuator',
        range[0],
        range[0] + 1,
        '[',
        locationCalculator,
      ),
    )
    tokens.push(
      createSimpleToken(
        'Punctuator',
        range[1] - 1,
        range[1],
        ']',
        locationCalculator,
      ),
    )

    replaceTokens(templateMeta, node.argument, tokens)
    insertComments(templateMeta, comments)
  }
  catch (error) {
    debug('[template] Parse error: %s', error)

    if (ParseError.isParseError(error)) {
      node.argument = {
        type: 'VExpressionContainer',
        range,
        loc,
        parent: node,
        expression: null,
        references: [],
      }
      insertError(templateMeta, error)
    }
    else {
      throw error
    }
  }
}

/**
 * Parse the given attribute name as a directive key.
 * @param node The identifier node to parse.
 * @returns The directive key node.
 */
function createDirectiveKey(
  node: VIdentifier,
  templateMeta: VineTemplateMeta,
  parserOptions: VineESLintParserOptions,
  locationCalculator: LocationCalculatorForHtml,
): VDirectiveKey {
  // Parse node and tokens.
  const directiveKey = parseDirectiveKeyStatically(node, templateMeta)
  const tokens = parseDirectiveKeyTokens(directiveKey)
  replaceTokens(templateMeta, directiveKey, tokens)

  // Drop `v-` prefix.
  if (directiveKey.name.name.startsWith('v-')) {
    directiveKey.name.name = directiveKey.name.name.slice(2)
  }
  if (directiveKey.name.rawName.startsWith('v-')) {
    directiveKey.name.rawName = directiveKey.name.rawName.slice(2)
  }

  // Parse dynamic argument.
  convertDynamicArgument(
    directiveKey,
    templateMeta,
    parserOptions,
    locationCalculator,
  )

  return directiveKey
}

/**
 * Replace the given attribute by a directive.
 * @param node The attribute node to replace. This function modifies this node directly.
 * @param code Whole source code text.
 * @param templateMeta template tokens, comments and errors.
 * @param locationCalculator The location calculator to adjust the locations of nodes.
 * @param htmlParserOptions The parser options to parse expressions.
 * @param scriptParserOptions The parser options to parse expressions.
 */
export function convertToDirective(
  node: VAttribute,
  code: string,
  templateMeta: VineTemplateMeta,
  locationCalculator: LocationCalculatorForHtml,
  htmlParserOptions: VineESLintParserOptions,
  scriptParserOptions: VineESLintParserOptions,
): void {
  debug(
    '[template] convert to directive: %s="%s" %j',
    node.key.name,
    node.value && node.value.value,
    node.range,
  )

  const directive: VDirective = node as any
  directive.directive = true
  directive.key = createDirectiveKey(
    node.key,
    templateMeta,
    htmlParserOptions,
    locationCalculator,
  )

  const { argument } = directive.key
  if (
    argument
        && argument.type === 'VIdentifier'
        && argument.name.startsWith('[')
  ) {
    const nextChar = code[argument.range[1]]
    if (nextChar == null || invalidDynamicArgumentNextChar.test(nextChar)) {
      const char = nextChar == null
        ? 'EOF'
        : JSON.stringify(nextChar).slice(1, -1)
      insertError(
        templateMeta,
        new ParseError(
          `Dynamic argument cannot contain the '${char}' character.`,
          undefined,
          argument.range[1],
          argument.loc.end.line,
          argument.loc.end.column,
        ),
      )
    }
  }

  if (node.value == null) {
    return
  }

  try {
    const ret = parseAttributeValue(
      code,
      htmlParserOptions,
      scriptParserOptions,
      locationCalculator,
      node.value,
      node.parent.parent,
      directive.key,
    )

    directive.value = {
      type: 'VExpressionContainer',
      range: node.value.range,
      loc: node.value.loc,
      parent: directive,
      expression: ret.expression,
      references: ret.references,
    }
    if (ret.expression != null) {
      ret.expression.parent = directive.value
    }

    for (const variable of ret.variables) {
      node.parent.parent.variables.push(variable)
    }

    replaceTokens(templateMeta, node.value, ret.tokens)
    insertComments(templateMeta, ret.comments)
  }
  catch (err) {
    debug('[template] Parse error: %s', err)

    if (ParseError.isParseError(err)) {
      directive.value = {
        type: 'VExpressionContainer',
        range: node.value.range,
        loc: node.value.loc,
        parent: directive,
        expression: null,
        references: [],
      }
      insertError(templateMeta, err)
    }
    else {
      throw err
    }
  }
}
