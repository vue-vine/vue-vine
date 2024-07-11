import { describe, expect, it } from 'vitest'
import type { VineESLintParserOptions } from '../src/types'
import { runParse } from '../src/parse'
import type {
  ESLintFunctionDeclaration,
  ESLintReturnStatement,
  HasLocation,
  VAttribute,
  VElement,
  VExpressionContainer,
  VIdentifier,
  VTemplateRoot,
} from '../src/ast'

function __loc(node: HasLocation, property: 'start' | 'end') {
  return JSON.stringify(node.loc[property])
}

describe('vine ESLint parser test', () => {
  it('should compute template node location correctly', () => {
    const sampleSourceCode = `
function MyComp() {
  const v1 = 10
  const fn1 = () => {}

  return vine\`
    <div>{{ v1 }}</div>
    <button @click="fn1">Hi</button>
  \`
}`.trim()

    const parserOptions: VineESLintParserOptions = {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }
    const { ast } = runParse(sampleSourceCode, parserOptions)
    const fnBodyStmts = (ast.body[0] as ESLintFunctionDeclaration).body?.body ?? []
    const fnLastStmt = fnBodyStmts[fnBodyStmts.length - 1]
    expect(fnLastStmt?.type).toMatchInlineSnapshot(`"ReturnStatement"`)
    const fnReturnArg = (fnLastStmt as ESLintReturnStatement).argument

    // The return statement's arg has been replaced with a VTemplateRoot node.
    expect(fnReturnArg?.type).toMatchInlineSnapshot(`"VTemplateRoot"`)
    const vTemplateRoot = fnReturnArg as any as VTemplateRoot
    expect(__loc(vTemplateRoot, 'start')).toMatchInlineSnapshot(`"{"line":5,"column":14}"`)
    expect(__loc(vTemplateRoot, 'end')).toMatchInlineSnapshot(`"{"line":8,"column":2}"`)

    // 1st: The space before the first div element is a VText node.
    const rootChild1 = vTemplateRoot.children[0]
    expect(rootChild1.type).toMatchInlineSnapshot(`"VText"`)
    expect(__loc(rootChild1, 'start')).toMatchInlineSnapshot(`"{"line":5,"column":14}"`)
    expect(__loc(rootChild1, 'end')).toMatchInlineSnapshot(`"{"line":6,"column":4}"`)

    // 2nd: The first div element is a VElement node.
    const rootChild2 = vTemplateRoot.children[1]
    expect(rootChild2.type).toMatchInlineSnapshot(`"VElement"`)
    expect(__loc(rootChild2, 'start')).toMatchInlineSnapshot(`"{"line":6,"column":4}"`)
    expect(__loc(rootChild2, 'end')).toMatchInlineSnapshot(`"{"line":6,"column":23}"`)

    // Next: Test the node location in JS expression
    const buttonNode = vTemplateRoot.children[3] as VElement
    expect(buttonNode.type).toMatchInlineSnapshot(`"VElement"`)
    expect(buttonNode.name).toBe('button')
    expect(__loc(buttonNode, 'start')).toMatchInlineSnapshot(`"{"line":7,"column":4}"`)
    expect(__loc(buttonNode, 'end')).toMatchInlineSnapshot(`"{"line":7,"column":36}"`)
    const buttonStartTag = buttonNode.startTag
    expect(__loc(buttonStartTag, 'start')).toMatchInlineSnapshot(`"{"line":7,"column":4}"`)
    expect(__loc(buttonStartTag, 'end')).toMatchInlineSnapshot(`"{"line":7,"column":25}"`)
    const onClick = buttonStartTag.attributes[0] as VAttribute
    expect(onClick.type).toMatchInlineSnapshot(`"VAttribute"`)
    expect(onClick.directive).toBe(true)
    expect(__loc(onClick, 'start')).toMatchInlineSnapshot(`"{"line":7,"column":12}"`)
    expect(__loc(onClick, 'end')).toMatchInlineSnapshot(`"{"line":7,"column":24}"`)
    expect(onClick.value?.type).toMatchInlineSnapshot(`"VExpressionContainer"`)
    const clickHandlerExpr = (onClick.value as any as VExpressionContainer).expression as any as VIdentifier
    expect(clickHandlerExpr?.type).toMatchInlineSnapshot(`"Identifier"`)
    expect(clickHandlerExpr?.name).toBe('fn1')
    expect(__loc(clickHandlerExpr, 'start')).toMatchInlineSnapshot(`"{"line":7,"column":20}"`)
    expect(__loc(clickHandlerExpr, 'end')).toMatchInlineSnapshot(`"{"line":7,"column":23}"`)
  })
})
