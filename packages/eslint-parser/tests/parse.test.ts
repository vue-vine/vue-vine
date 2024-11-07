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
import type { VineESLintParserOptions } from '../src/types'
import { describe, expect, it } from 'vitest'
import { runParse } from '../src/parse'

function __loc(node: HasLocation, property: 'start' | 'end') {
  return JSON.stringify(node.loc[property])
}
function __(obj: any) {
  return JSON.stringify(obj)
}

const sampleSourceCode = `
function MyComp() {
  const v1 = 10
  const count = ref(0)
  const fn2 = () => {}

  return vine\`
    <div>{{ v1 }}</div>
    <Test :num="count">Hi</Test>
    <button @click="fn2('/hello')">Btn2</button>
  \`
}`.trim()

describe('vine ESLint parser test', () => {
  it('should compute template node location correctly', () => {
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
    expect(__loc(vTemplateRoot, 'start')).toMatchInlineSnapshot(`"{"line":6,"column":14}"`)
    expect(__loc(vTemplateRoot, 'end')).toMatchInlineSnapshot(`"{"line":10,"column":2}"`)

    // 1st: The space before the first div element is a VText node.
    const rootChild1 = vTemplateRoot.children[0]
    expect(rootChild1.type).toMatchInlineSnapshot(`"VText"`)
    expect(__loc(rootChild1, 'start')).toMatchInlineSnapshot(`"{"line":6,"column":14}"`)
    expect(__loc(rootChild1, 'end')).toMatchInlineSnapshot(`"{"line":7,"column":4}"`)

    // 2nd: The first div element is a VElement node.
    const rootChild2 = vTemplateRoot.children[1]
    expect(rootChild2.type).toMatchInlineSnapshot(`"VElement"`)
    expect(__loc(rootChild2, 'start')).toMatchInlineSnapshot(`"{"line":7,"column":4}"`)
    expect(__loc(rootChild2, 'end')).toMatchInlineSnapshot(`"{"line":7,"column":23}"`)

    // Expression container inside the 1st div element
    const divNode = (rootChild2 as VElement).children[0] as VExpressionContainer
    expect(divNode.type).toMatchInlineSnapshot(`"VExpressionContainer"`)
    expect(__loc(divNode, 'start')).toMatchInlineSnapshot(`"{"line":7,"column":9}"`)
    expect(__loc(divNode, 'end')).toMatchInlineSnapshot(`"{"line":7,"column":17}"`)

    // Identifier inside the expression container
    const v1Identifier = divNode.expression as any as VIdentifier
    expect(v1Identifier.type).toMatchInlineSnapshot(`"Identifier"`)
    expect(v1Identifier.name).toBe('v1')
    expect(__loc(v1Identifier, 'start')).toMatchInlineSnapshot(`"{"line":7,"column":12}"`)
    expect(__loc(v1Identifier, 'end')).toMatchInlineSnapshot(`"{"line":7,"column":14}"`)

    // Next: Test the node location in JS expression
    const buttonNode = vTemplateRoot.children[3] as VElement
    expect(buttonNode.type).toMatchInlineSnapshot(`"VElement"`)
    expect(buttonNode.name).toBe('test')
    expect(__loc(buttonNode, 'start')).toMatchInlineSnapshot(`"{"line":8,"column":4}"`)
    expect(__loc(buttonNode, 'end')).toMatchInlineSnapshot(`"{"line":8,"column":32}"`)
    const buttonStartTag = buttonNode.startTag
    expect(__loc(buttonStartTag, 'start')).toMatchInlineSnapshot(`"{"line":8,"column":4}"`)
    expect(__loc(buttonStartTag, 'end')).toMatchInlineSnapshot(`"{"line":8,"column":23}"`)
    const vBind = buttonStartTag.attributes[0] as VAttribute
    expect(vBind.type).toMatchInlineSnapshot(`"VAttribute"`)
    expect(vBind.directive).toBe(true)
    expect(__loc(vBind, 'start')).toMatchInlineSnapshot(`"{"line":8,"column":10}"`)
    expect(__loc(vBind, 'end')).toMatchInlineSnapshot(`"{"line":8,"column":22}"`)
    expect(vBind.value?.type).toMatchInlineSnapshot(`"VExpressionContainer"`)
    const vBindExpr = (vBind.value as any as VExpressionContainer).expression as any as VIdentifier
    expect(vBindExpr?.type).toMatchInlineSnapshot(`"Identifier"`)
    expect(vBindExpr?.name).toBe('count')
    expect(__loc(vBindExpr, 'start')).toMatchInlineSnapshot(`"{"line":8,"column":16}"`)
    expect(__loc(vBindExpr, 'end')).toMatchInlineSnapshot(`"{"line":8,"column":21}"`)
  })

  it('should fix location for all tokens in template based on current TypeScript file', () => {
    const parserOptions: VineESLintParserOptions = {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }
    const { ast: { tokens } } = runParse(sampleSourceCode, parserOptions)
    if (!tokens) {
      throw new Error('No tokens found in the AST.')
    }
    expect(tokens.length).toMatchInlineSnapshot(`62`)
    expect(__(tokens[24])).toMatchInlineSnapshot(`"{"type":"Keyword","loc":{"end":{"column":8,"line":6},"start":{"column":2,"line":6}},"range":[85,91],"value":"return"}"`)
    expect(__(tokens[25])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[97,102],"loc":{"start":{"line":6,"column":14},"end":{"line":7,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[26])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[102,106],"loc":{"start":{"line":7,"column":4},"end":{"line":7,"column":8}},"value":"div"}"`)
    expect(__(tokens[27])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[106,107],"loc":{"start":{"line":7,"column":8},"end":{"line":7,"column":9}},"value":""}"`)
    expect(__(tokens[28])).toMatchInlineSnapshot(`"{"type":"VExpressionStart","range":[107,109],"loc":{"start":{"line":7,"column":9},"end":{"line":7,"column":11}},"value":"{{"}"`)
    expect(__(tokens[29])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"v1","start":13,"end":15,"loc":{"start":{"line":7,"column":12},"end":{"line":7,"column":14}},"range":[110,112]}"`)
    expect(__(tokens[30])).toMatchInlineSnapshot(`"{"type":"VExpressionEnd","range":[113,115],"loc":{"start":{"line":7,"column":15},"end":{"line":7,"column":17}},"value":"}}"}"`)
    expect(__(tokens[31])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[115,120],"loc":{"start":{"line":7,"column":17},"end":{"line":7,"column":22}},"value":"div"}"`)
    expect(__(tokens[32])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[120,121],"loc":{"start":{"line":7,"column":22},"end":{"line":7,"column":23}},"value":""}"`)
    expect(__(tokens[33])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[121,126],"loc":{"start":{"line":7,"column":23},"end":{"line":8,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[34])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[126,131],"loc":{"start":{"line":8,"column":4},"end":{"line":8,"column":9}},"value":"test"}"`)
    expect(__(tokens[35])).toMatchInlineSnapshot(`"{"type":"HTMLIdentifier","range":[132,136],"loc":{"start":{"line":8,"column":10},"end":{"line":8,"column":14}},"value":":num"}"`)
    expect(__(tokens[36])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[132,133],"loc":{"start":{"column":10,"line":8},"end":{"column":11,"line":8}},"value":":"}"`)
    expect(__(tokens[37])).toMatchInlineSnapshot(`"{"type":"HTMLAssociation","range":[136,137],"loc":{"start":{"line":8,"column":14},"end":{"line":8,"column":15}},"value":""}"`)
    expect(__(tokens[38])).toMatchInlineSnapshot(`"{"type":"HTMLLiteral","range":[137,144],"loc":{"start":{"line":8,"column":15},"end":{"line":8,"column":22}},"value":"count"}"`)
    expect(__(tokens[39])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[137,138],"loc":{"start":{"line":8,"column":15},"end":{"line":8,"column":16}},"value":"\\""}"`)
    expect(__(tokens[40])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"count","start":41,"end":46,"loc":{"start":{"line":8,"column":16},"end":{"line":8,"column":21}},"range":[138,143]}"`)
    expect(__(tokens[41])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[144,145],"loc":{"start":{"line":8,"column":22},"end":{"line":8,"column":23}},"value":""}"`)
    expect(__(tokens[42])).toMatchInlineSnapshot(`"{"type":"HTMLText","range":[145,147],"loc":{"start":{"line":8,"column":23},"end":{"line":8,"column":25}},"value":"Hi"}"`)
    expect(__(tokens[43])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[147,153],"loc":{"start":{"line":8,"column":25},"end":{"line":8,"column":31}},"value":"test"}"`)
    expect(__(tokens[44])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[153,154],"loc":{"start":{"line":8,"column":31},"end":{"line":8,"column":32}},"value":""}"`)
    expect(__(tokens[45])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[154,159],"loc":{"start":{"line":8,"column":32},"end":{"line":9,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[46])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[159,166],"loc":{"start":{"line":9,"column":4},"end":{"line":9,"column":11}},"value":"button"}"`)
    expect(__(tokens[47])).toMatchInlineSnapshot(`"{"type":"HTMLIdentifier","range":[167,173],"loc":{"start":{"line":9,"column":12},"end":{"line":9,"column":18}},"value":"@click"}"`)
    expect(__(tokens[48])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[167,168],"loc":{"start":{"column":12,"line":9},"end":{"column":13,"line":9}},"value":"@"}"`)
    expect(__(tokens[49])).toMatchInlineSnapshot(`"{"type":"HTMLAssociation","range":[173,174],"loc":{"start":{"line":9,"column":18},"end":{"line":9,"column":19}},"value":""}"`)
    expect(__(tokens[50])).toMatchInlineSnapshot(`"{"type":"HTMLLiteral","range":[174,189],"loc":{"start":{"line":9,"column":19},"end":{"line":9,"column":34}},"value":"fn2('/hello')"}"`)
    expect(__(tokens[51])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[174,175],"loc":{"start":{"line":9,"column":19},"end":{"line":9,"column":20}},"value":"\\""}"`)
    expect(__(tokens[52])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"fn2","start":78,"end":81,"loc":{"start":{"line":9,"column":20},"end":{"line":9,"column":23}},"range":[175,178]}"`)
    expect(__(tokens[53])).toMatchInlineSnapshot(`"{"type":"Punctuator","value":"(","start":81,"end":82,"loc":{"start":{"line":9,"column":23},"end":{"line":9,"column":24}},"range":[178,179]}"`)
    expect(__(tokens[54])).toMatchInlineSnapshot(`"{"type":"String","value":"'/hello'","start":82,"end":90,"loc":{"start":{"line":9,"column":24},"end":{"line":9,"column":32}},"range":[179,187]}"`)
    expect(__(tokens[55])).toMatchInlineSnapshot(`"{"type":"Punctuator","value":")","start":90,"end":91,"loc":{"start":{"line":9,"column":32},"end":{"line":9,"column":33}},"range":[187,188]}"`)
    expect(__(tokens[56])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[188,189],"loc":{"start":{"line":9,"column":33},"end":{"line":9,"column":34}},"value":"\\""}"`)
    expect(__(tokens[57])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[189,190],"loc":{"start":{"line":9,"column":34},"end":{"line":9,"column":35}},"value":""}"`)
    expect(__(tokens[58])).toMatchInlineSnapshot(`"{"type":"HTMLText","range":[190,194],"loc":{"start":{"line":9,"column":35},"end":{"line":9,"column":39}},"value":"Btn2"}"`)
    expect(__(tokens[59])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[194,202],"loc":{"start":{"line":9,"column":39},"end":{"line":9,"column":47}},"value":"button"}"`)
    expect(__(tokens[60])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[202,203],"loc":{"start":{"line":9,"column":47},"end":{"line":9,"column":48}},"value":""}"`)
    expect(__(tokens[61])).toMatchInlineSnapshot(`"{"type":"Punctuator","loc":{"end":{"column":1,"line":11},"start":{"column":0,"line":11}},"range":[208,209],"value":"}"}"`)
  })
})
