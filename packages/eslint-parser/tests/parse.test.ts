import type {
  ESLintFunctionDeclaration,
  ESLintReturnStatement,
  HasLocation,
  VAttribute,
  VDirective,
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

const sampleSourceCode1 = `
function MyComp() {
  const v1 = 10
  const count = ref(0)
  const fn2 = () => {}
  const title = ref('Here is a title')

  return vine\`
    <div>{{ v1 }}</div>
    <Test :num="count" :title>Hi</Test>
    <button @click="fn2('/hello')">Btn2</button>
  \`
}`.trim()

describe('vine ESLint parser test 1', () => {
  it('should compute template node location correctly', () => {
    const parserOptions: VineESLintParserOptions = {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }
    const { ast } = runParse(sampleSourceCode1, parserOptions)
    const fnBodyStmts = (ast.body[0] as ESLintFunctionDeclaration).body?.body ?? []
    const fnLastStmt = fnBodyStmts[fnBodyStmts.length - 1]
    expect(fnLastStmt?.type).toMatchInlineSnapshot(`"ReturnStatement"`)
    const fnReturnArg = (fnLastStmt as ESLintReturnStatement).argument

    // The return statement's arg has been replaced with a VTemplateRoot node.
    expect(fnReturnArg?.type).toMatchInlineSnapshot(`"VTemplateRoot"`)
    const vTemplateRoot = fnReturnArg as any as VTemplateRoot
    expect(__loc(vTemplateRoot, 'start')).toMatchInlineSnapshot(`"{"line":7,"column":14}"`)
    expect(__loc(vTemplateRoot, 'end')).toMatchInlineSnapshot(`"{"line":11,"column":2}"`)

    // 1st: The space before the first div element is a VText node.
    const rootChild1 = vTemplateRoot.children[0]
    expect(rootChild1.type).toMatchInlineSnapshot(`"VText"`)
    expect(__loc(rootChild1, 'start')).toMatchInlineSnapshot(`"{"line":7,"column":14}"`)
    expect(__loc(rootChild1, 'end')).toMatchInlineSnapshot(`"{"line":8,"column":4}"`)

    // 2nd: The first div element is a VElement node.
    const rootChild2 = vTemplateRoot.children[1]
    expect(rootChild2.type).toMatchInlineSnapshot(`"VElement"`)
    expect(__loc(rootChild2, 'start')).toMatchInlineSnapshot(`"{"line":8,"column":4}"`)
    expect(__loc(rootChild2, 'end')).toMatchInlineSnapshot(`"{"line":8,"column":23}"`)

    // Expression container inside the 1st div element
    const divNode = (rootChild2 as VElement).children[0] as VExpressionContainer
    expect(divNode.type).toMatchInlineSnapshot(`"VExpressionContainer"`)
    expect(__loc(divNode, 'start')).toMatchInlineSnapshot(`"{"line":8,"column":9}"`)
    expect(__loc(divNode, 'end')).toMatchInlineSnapshot(`"{"line":8,"column":17}"`)

    // Identifier inside the expression container
    const v1Identifier = divNode.expression as any as VIdentifier
    expect(v1Identifier.type).toMatchInlineSnapshot(`"Identifier"`)
    expect(v1Identifier.name).toBe('v1')
    expect(__loc(v1Identifier, 'start')).toMatchInlineSnapshot(`"{"line":8,"column":12}"`)
    expect(__loc(v1Identifier, 'end')).toMatchInlineSnapshot(`"{"line":8,"column":14}"`)

    // Next: Test the node location in JS expression
    const buttonNode = vTemplateRoot.children[3] as VElement
    expect(buttonNode.type).toMatchInlineSnapshot(`"VElement"`)
    expect(buttonNode.name).toBe('test')
    expect(__loc(buttonNode, 'start')).toMatchInlineSnapshot(`"{"line":9,"column":4}"`)
    expect(__loc(buttonNode, 'end')).toMatchInlineSnapshot(`"{"line":9,"column":39}"`)
    const buttonStartTag = buttonNode.startTag
    expect(__loc(buttonStartTag, 'start')).toMatchInlineSnapshot(`"{"line":9,"column":4}"`)
    expect(__loc(buttonStartTag, 'end')).toMatchInlineSnapshot(`"{"line":9,"column":30}"`)
    const vBind = buttonStartTag.attributes[0] as VAttribute
    expect(vBind.type).toMatchInlineSnapshot(`"VAttribute"`)
    expect(vBind.directive).toBe(true)
    expect(__loc(vBind, 'start')).toMatchInlineSnapshot(`"{"line":9,"column":10}"`)
    expect(__loc(vBind, 'end')).toMatchInlineSnapshot(`"{"line":9,"column":22}"`)
    expect(vBind.value?.type).toMatchInlineSnapshot(`"VExpressionContainer"`)
    const vBindExpr = (vBind.value as any as VExpressionContainer).expression as any as VIdentifier
    expect(vBindExpr?.type).toMatchInlineSnapshot(`"Identifier"`)
    expect(vBindExpr?.name).toBe('count')
    expect(__loc(vBindExpr, 'start')).toMatchInlineSnapshot(`"{"line":9,"column":16}"`)
    expect(__loc(vBindExpr, 'end')).toMatchInlineSnapshot(`"{"line":9,"column":21}"`)

    const vBindShorthand = buttonStartTag.attributes[1] as VAttribute
    expect(vBindShorthand.type).toMatchInlineSnapshot(`"VAttribute"`)
    expect(vBindShorthand.directive).toBe(true)
    expect(__loc(vBindShorthand, 'start')).toMatchInlineSnapshot(`"{"line":9,"column":23}"`)
    expect(__loc(vBindShorthand, 'end')).toMatchInlineSnapshot(`"{"line":9,"column":29}"`)
  })

  it('should fix location for all tokens in template based on current TypeScript file', () => {
    const parserOptions: VineESLintParserOptions = {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }
    const { ast: { tokens } } = runParse(sampleSourceCode1, parserOptions)
    if (!tokens) {
      throw new Error('No tokens found in the AST.')
    }
    expect(tokens.length).toMatchInlineSnapshot(`71`)
    expect(__(tokens[24])).toMatchInlineSnapshot(`"{"type":"Keyword","loc":{"end":{"column":7,"line":5},"start":{"column":2,"line":5}},"range":[84,89],"value":"const"}"`)
    expect(__(tokens[25])).toMatchInlineSnapshot(`"{"type":"Identifier","loc":{"end":{"column":13,"line":5},"start":{"column":8,"line":5}},"range":[90,95],"value":"title"}"`)
    expect(__(tokens[26])).toMatchInlineSnapshot(`"{"type":"Punctuator","loc":{"end":{"column":15,"line":5},"start":{"column":14,"line":5}},"range":[96,97],"value":"="}"`)
    expect(__(tokens[27])).toMatchInlineSnapshot(`"{"type":"Identifier","loc":{"end":{"column":19,"line":5},"start":{"column":16,"line":5}},"range":[98,101],"value":"ref"}"`)
    expect(__(tokens[28])).toMatchInlineSnapshot(`"{"type":"Punctuator","loc":{"end":{"column":20,"line":5},"start":{"column":19,"line":5}},"range":[101,102],"value":"("}"`)
    expect(__(tokens[29])).toMatchInlineSnapshot(`"{"type":"String","loc":{"end":{"column":37,"line":5},"start":{"column":20,"line":5}},"range":[102,119],"value":"'Here is a title'"}"`)
    expect(__(tokens[30])).toMatchInlineSnapshot(`"{"type":"Punctuator","loc":{"end":{"column":38,"line":5},"start":{"column":37,"line":5}},"range":[119,120],"value":")"}"`)
    expect(__(tokens[31])).toMatchInlineSnapshot(`"{"type":"Keyword","loc":{"end":{"column":8,"line":7},"start":{"column":2,"line":7}},"range":[124,130],"value":"return"}"`)
    expect(__(tokens[32])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[136,141],"loc":{"start":{"line":7,"column":14},"end":{"line":8,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[33])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[141,145],"loc":{"start":{"line":8,"column":4},"end":{"line":8,"column":8}},"value":"div"}"`)
    expect(__(tokens[34])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[145,146],"loc":{"start":{"line":8,"column":8},"end":{"line":8,"column":9}},"value":""}"`)
    expect(__(tokens[35])).toMatchInlineSnapshot(`"{"type":"VExpressionStart","range":[146,148],"loc":{"start":{"line":8,"column":9},"end":{"line":8,"column":11}},"value":"{{"}"`)
    expect(__(tokens[36])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"v1","start":149,"end":151,"loc":{"start":{"line":8,"column":12},"end":{"line":8,"column":14}},"range":[149,151]}"`)
    expect(__(tokens[37])).toMatchInlineSnapshot(`"{"type":"VExpressionEnd","range":[152,154],"loc":{"start":{"line":8,"column":15},"end":{"line":8,"column":17}},"value":"}}"}"`)
    expect(__(tokens[38])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[154,159],"loc":{"start":{"line":8,"column":17},"end":{"line":8,"column":22}},"value":"div"}"`)
    expect(__(tokens[39])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[159,160],"loc":{"start":{"line":8,"column":22},"end":{"line":8,"column":23}},"value":""}"`)
    expect(__(tokens[40])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[160,165],"loc":{"start":{"line":8,"column":23},"end":{"line":9,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[41])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[165,170],"loc":{"start":{"line":9,"column":4},"end":{"line":9,"column":9}},"value":"test"}"`)
    expect(__(tokens[42])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[171,172],"loc":{"start":{"column":10,"line":9},"end":{"column":11,"line":9}},"value":":"}"`)
    expect(__(tokens[43])).toMatchInlineSnapshot(`"{"type":"HTMLIdentifier","range":[172,175],"loc":{"start":{"column":11,"line":9},"end":{"column":14,"line":9}},"value":"num"}"`)
    expect(__(tokens[44])).toMatchInlineSnapshot(`"{"type":"HTMLAssociation","range":[175,176],"loc":{"start":{"line":9,"column":14},"end":{"line":9,"column":15}},"value":""}"`)
    expect(__(tokens[45])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[176,177],"loc":{"start":{"line":9,"column":15},"end":{"line":9,"column":16}},"value":"\\""}"`)
    expect(__(tokens[46])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"count","start":177,"end":182,"loc":{"start":{"line":9,"column":16},"end":{"line":9,"column":21}},"range":[177,182]}"`)
    expect(__(tokens[47])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[182,183],"loc":{"start":{"line":9,"column":21},"end":{"line":9,"column":22}},"value":"\\""}"`)
    expect(__(tokens[48])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[184,185],"loc":{"start":{"column":23,"line":9},"end":{"column":24,"line":9}},"value":":"}"`)
    expect(__(tokens[49])).toMatchInlineSnapshot(`"{"type":"HTMLIdentifier","range":[185,190],"loc":{"start":{"column":24,"line":9},"end":{"column":29,"line":9}},"value":"title"}"`)
    expect(__(tokens[50])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[190,191],"loc":{"start":{"line":9,"column":29},"end":{"line":9,"column":30}},"value":""}"`)
    expect(__(tokens[51])).toMatchInlineSnapshot(`"{"type":"HTMLText","range":[191,193],"loc":{"start":{"line":9,"column":30},"end":{"line":9,"column":32}},"value":"Hi"}"`)
    expect(__(tokens[52])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[193,199],"loc":{"start":{"line":9,"column":32},"end":{"line":9,"column":38}},"value":"test"}"`)
    expect(__(tokens[53])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[199,200],"loc":{"start":{"line":9,"column":38},"end":{"line":9,"column":39}},"value":""}"`)
    expect(__(tokens[54])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[200,205],"loc":{"start":{"line":9,"column":39},"end":{"line":10,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[55])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[205,212],"loc":{"start":{"line":10,"column":4},"end":{"line":10,"column":11}},"value":"button"}"`)
    expect(__(tokens[56])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[213,214],"loc":{"start":{"column":12,"line":10},"end":{"column":13,"line":10}},"value":"@"}"`)
    expect(__(tokens[57])).toMatchInlineSnapshot(`"{"type":"HTMLIdentifier","range":[214,219],"loc":{"start":{"column":13,"line":10},"end":{"column":18,"line":10}},"value":"click"}"`)
    expect(__(tokens[58])).toMatchInlineSnapshot(`"{"type":"HTMLAssociation","range":[219,220],"loc":{"start":{"line":10,"column":18},"end":{"line":10,"column":19}},"value":""}"`)
    expect(__(tokens[59])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[220,221],"loc":{"start":{"line":10,"column":19},"end":{"line":10,"column":20}},"value":"\\""}"`)
    expect(__(tokens[60])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"fn2","start":221,"end":224,"loc":{"start":{"line":10,"column":20},"end":{"line":10,"column":23}},"range":[221,224]}"`)
    expect(__(tokens[61])).toMatchInlineSnapshot(`"{"type":"Punctuator","value":"(","start":224,"end":225,"loc":{"start":{"line":10,"column":23},"end":{"line":10,"column":24}},"range":[224,225]}"`)
  })
})

const sampleSourceCode2 = `
function AboutPage() {
  const content = ref('hello world')
  const handleEmitCamel = (bar: string) => {
    console.log(bar)
  }

  return vine\`
    <PageHeader />
    <div>
      <h2>About page</h2>
    </div>
    <TestSlotContainer fizz="bass" @emit-camel="handleEmitCamel">
      <template #slotCamel="{ foo }">
        <p>in slot: {{ foo }}</p>
      </template>
    </TestSlotContainer>
    <p v-text="content">Be Overwritten</p>
  \`
}
`.trim()

describe('vine ESLint parser test 2', () => {
  it('should generate correct tokens sequence', () => {
    const parserOptions: VineESLintParserOptions = {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }
    const { ast: { tokens } } = runParse(sampleSourceCode2, parserOptions)
    if (!tokens) {
      throw new Error('No tokens found in the AST.')
    }

    expect(tokens.length).toMatchInlineSnapshot(`103`)
    expect(__(tokens[31])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[150,161],"loc":{"start":{"line":8,"column":4},"end":{"line":8,"column":15}},"value":"pageheader"}"`)
    expect(__(tokens[32])).toMatchInlineSnapshot(`"{"type":"HTMLSelfClosingTagClose","range":[162,164],"loc":{"start":{"line":8,"column":16},"end":{"line":8,"column":18}},"value":""}"`)
    expect(__(tokens[33])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[164,169],"loc":{"start":{"line":8,"column":18},"end":{"line":9,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[34])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[169,173],"loc":{"start":{"line":9,"column":4},"end":{"line":9,"column":8}},"value":"div"}"`)
    expect(__(tokens[35])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[173,174],"loc":{"start":{"line":9,"column":8},"end":{"line":9,"column":9}},"value":""}"`)
    expect(__(tokens[36])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[174,181],"loc":{"start":{"line":9,"column":9},"end":{"line":10,"column":6}},"value":"\\n      "}"`)
    expect(__(tokens[37])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[181,184],"loc":{"start":{"line":10,"column":6},"end":{"line":10,"column":9}},"value":"h2"}"`)
    expect(__(tokens[38])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[184,185],"loc":{"start":{"line":10,"column":9},"end":{"line":10,"column":10}},"value":""}"`)
    expect(__(tokens[39])).toMatchInlineSnapshot(`"{"type":"HTMLText","range":[185,190],"loc":{"start":{"line":10,"column":10},"end":{"line":10,"column":15}},"value":"About"}"`)
    expect(__(tokens[40])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[190,191],"loc":{"start":{"line":10,"column":15},"end":{"line":10,"column":16}},"value":" "}"`)
    expect(__(tokens[41])).toMatchInlineSnapshot(`"{"type":"HTMLText","range":[191,195],"loc":{"start":{"line":10,"column":16},"end":{"line":10,"column":20}},"value":"page"}"`)
    expect(__(tokens[42])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[195,199],"loc":{"start":{"line":10,"column":20},"end":{"line":10,"column":24}},"value":"h2"}"`)
    expect(__(tokens[43])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[199,200],"loc":{"start":{"line":10,"column":24},"end":{"line":10,"column":25}},"value":""}"`)
    expect(__(tokens[44])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[200,205],"loc":{"start":{"line":10,"column":25},"end":{"line":11,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[45])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[205,210],"loc":{"start":{"line":11,"column":4},"end":{"line":11,"column":9}},"value":"div"}"`)
    expect(__(tokens[46])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[210,211],"loc":{"start":{"line":11,"column":9},"end":{"line":11,"column":10}},"value":""}"`)
    expect(__(tokens[47])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[211,216],"loc":{"start":{"line":11,"column":10},"end":{"line":12,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[48])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[216,234],"loc":{"start":{"line":12,"column":4},"end":{"line":12,"column":22}},"value":"testslotcontainer"}"`)
    expect(__(tokens[49])).toMatchInlineSnapshot(`"{"type":"HTMLIdentifier","range":[235,239],"loc":{"start":{"line":12,"column":23},"end":{"line":12,"column":27}},"value":"fizz"}"`)
    expect(__(tokens[50])).toMatchInlineSnapshot(`"{"type":"HTMLAssociation","range":[239,240],"loc":{"start":{"line":12,"column":27},"end":{"line":12,"column":28}},"value":""}"`)
    expect(__(tokens[51])).toMatchInlineSnapshot(`"{"type":"HTMLLiteral","range":[240,246],"loc":{"start":{"line":12,"column":28},"end":{"line":12,"column":34}},"value":"bass"}"`)
    expect(__(tokens[52])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[247,248],"loc":{"start":{"column":35,"line":12},"end":{"column":36,"line":12}},"value":"@"}"`)
    expect(__(tokens[53])).toMatchInlineSnapshot(`"{"type":"HTMLIdentifier","range":[248,258],"loc":{"start":{"column":36,"line":12},"end":{"column":46,"line":12}},"value":"emit-camel"}"`)
    expect(__(tokens[54])).toMatchInlineSnapshot(`"{"type":"HTMLAssociation","range":[258,259],"loc":{"start":{"line":12,"column":46},"end":{"line":12,"column":47}},"value":""}"`)
    expect(__(tokens[55])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[259,260],"loc":{"start":{"line":12,"column":47},"end":{"line":12,"column":48}},"value":"\\""}"`)
    expect(__(tokens[56])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"handleEmitCamel","start":260,"end":275,"loc":{"start":{"line":12,"column":48},"end":{"line":12,"column":63}},"range":[260,275]}"`)
    expect(__(tokens[57])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[275,276],"loc":{"start":{"line":12,"column":63},"end":{"line":12,"column":64}},"value":"\\""}"`)
    expect(__(tokens[58])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[276,277],"loc":{"start":{"line":12,"column":64},"end":{"line":12,"column":65}},"value":""}"`)
    expect(__(tokens[59])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[277,284],"loc":{"start":{"line":12,"column":65},"end":{"line":13,"column":6}},"value":"\\n      "}"`)
    expect(__(tokens[60])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[284,293],"loc":{"start":{"line":13,"column":6},"end":{"line":13,"column":15}},"value":"template"}"`)
    expect(__(tokens[61])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[294,295],"loc":{"start":{"column":16,"line":13},"end":{"column":17,"line":13}},"value":"#"}"`)
    expect(__(tokens[62])).toMatchInlineSnapshot(`"{"type":"HTMLIdentifier","range":[295,304],"loc":{"start":{"column":17,"line":13},"end":{"column":26,"line":13}},"value":"slotCamel"}"`)
    expect(__(tokens[63])).toMatchInlineSnapshot(`"{"type":"HTMLAssociation","range":[304,305],"loc":{"start":{"line":13,"column":26},"end":{"line":13,"column":27}},"value":""}"`)
    expect(__(tokens[64])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[305,306],"loc":{"start":{"line":13,"column":27},"end":{"line":13,"column":28}},"value":"\\""}"`)
    expect(__(tokens[65])).toMatchInlineSnapshot(`"{"type":"Punctuator","value":"{","start":306,"end":307,"loc":{"start":{"line":13,"column":28},"end":{"line":13,"column":29}},"range":[306,307]}"`)
    expect(__(tokens[66])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"foo","start":308,"end":311,"loc":{"start":{"line":13,"column":30},"end":{"line":13,"column":33}},"range":[308,311]}"`)
    expect(__(tokens[67])).toMatchInlineSnapshot(`"{"type":"Punctuator","value":"}","start":312,"end":313,"loc":{"start":{"line":13,"column":34},"end":{"line":13,"column":35}},"range":[312,313]}"`)
    expect(__(tokens[68])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[313,314],"loc":{"start":{"line":13,"column":35},"end":{"line":13,"column":36}},"value":"\\""}"`)
    expect(__(tokens[69])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[314,315],"loc":{"start":{"line":13,"column":36},"end":{"line":13,"column":37}},"value":""}"`)
    expect(__(tokens[70])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[315,324],"loc":{"start":{"line":13,"column":37},"end":{"line":14,"column":8}},"value":"\\n        "}"`)
    expect(__(tokens[71])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[324,326],"loc":{"start":{"line":14,"column":8},"end":{"line":14,"column":10}},"value":"p"}"`)
    expect(__(tokens[72])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[326,327],"loc":{"start":{"line":14,"column":10},"end":{"line":14,"column":11}},"value":""}"`)
    expect(__(tokens[73])).toMatchInlineSnapshot(`"{"type":"HTMLText","range":[327,329],"loc":{"start":{"line":14,"column":11},"end":{"line":14,"column":13}},"value":"in"}"`)
    expect(__(tokens[74])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[329,330],"loc":{"start":{"line":14,"column":13},"end":{"line":14,"column":14}},"value":" "}"`)
    expect(__(tokens[75])).toMatchInlineSnapshot(`"{"type":"HTMLText","range":[330,335],"loc":{"start":{"line":14,"column":14},"end":{"line":14,"column":19}},"value":"slot:"}"`)
    expect(__(tokens[76])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[335,336],"loc":{"start":{"line":14,"column":19},"end":{"line":14,"column":20}},"value":" "}"`)
    expect(__(tokens[77])).toMatchInlineSnapshot(`"{"type":"VExpressionStart","range":[336,338],"loc":{"start":{"line":14,"column":20},"end":{"line":14,"column":22}},"value":"{{"}"`)
    expect(__(tokens[78])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"foo","start":339,"end":342,"loc":{"start":{"line":14,"column":23},"end":{"line":14,"column":26}},"range":[339,342]}"`)
    expect(__(tokens[79])).toMatchInlineSnapshot(`"{"type":"VExpressionEnd","range":[343,345],"loc":{"start":{"line":14,"column":27},"end":{"line":14,"column":29}},"value":"}}"}"`)
    expect(__(tokens[80])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[345,348],"loc":{"start":{"line":14,"column":29},"end":{"line":14,"column":32}},"value":"p"}"`)
    expect(__(tokens[81])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[348,349],"loc":{"start":{"line":14,"column":32},"end":{"line":14,"column":33}},"value":""}"`)
    expect(__(tokens[82])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[349,356],"loc":{"start":{"line":14,"column":33},"end":{"line":15,"column":6}},"value":"\\n      "}"`)
    expect(__(tokens[83])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[356,366],"loc":{"start":{"line":15,"column":6},"end":{"line":15,"column":16}},"value":"template"}"`)
    expect(__(tokens[84])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[366,367],"loc":{"start":{"line":15,"column":16},"end":{"line":15,"column":17}},"value":""}"`)
    expect(__(tokens[85])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[367,372],"loc":{"start":{"line":15,"column":17},"end":{"line":16,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[86])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[372,391],"loc":{"start":{"line":16,"column":4},"end":{"line":16,"column":23}},"value":"testslotcontainer"}"`)
    expect(__(tokens[87])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[391,392],"loc":{"start":{"line":16,"column":23},"end":{"line":16,"column":24}},"value":""}"`)
    expect(__(tokens[88])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[392,397],"loc":{"start":{"line":16,"column":24},"end":{"line":17,"column":4}},"value":"\\n    "}"`)
    expect(__(tokens[89])).toMatchInlineSnapshot(`"{"type":"HTMLTagOpen","range":[397,399],"loc":{"start":{"line":17,"column":4},"end":{"line":17,"column":6}},"value":"p"}"`)
    expect(__(tokens[90])).toMatchInlineSnapshot(`"{"type":"HTMLIdentifier","range":[400,406],"loc":{"start":{"column":7,"line":17},"end":{"column":13,"line":17}},"value":"v-text"}"`)
    expect(__(tokens[91])).toMatchInlineSnapshot(`"{"type":"HTMLAssociation","range":[406,407],"loc":{"start":{"line":17,"column":13},"end":{"line":17,"column":14}},"value":""}"`)
    expect(__(tokens[92])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[407,408],"loc":{"start":{"line":17,"column":14},"end":{"line":17,"column":15}},"value":"\\""}"`)
    expect(__(tokens[93])).toMatchInlineSnapshot(`"{"type":"Identifier","value":"content","start":408,"end":415,"loc":{"start":{"line":17,"column":15},"end":{"line":17,"column":22}},"range":[408,415]}"`)
    expect(__(tokens[94])).toMatchInlineSnapshot(`"{"type":"Punctuator","range":[415,416],"loc":{"start":{"line":17,"column":22},"end":{"line":17,"column":23}},"value":"\\""}"`)
    expect(__(tokens[95])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[416,417],"loc":{"start":{"line":17,"column":23},"end":{"line":17,"column":24}},"value":""}"`)
    expect(__(tokens[96])).toMatchInlineSnapshot(`"{"type":"HTMLText","range":[417,419],"loc":{"start":{"line":17,"column":24},"end":{"line":17,"column":26}},"value":"Be"}"`)
    expect(__(tokens[97])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[419,420],"loc":{"start":{"line":17,"column":26},"end":{"line":17,"column":27}},"value":" "}"`)
    expect(__(tokens[98])).toMatchInlineSnapshot(`"{"type":"HTMLText","range":[420,431],"loc":{"start":{"line":17,"column":27},"end":{"line":17,"column":38}},"value":"Overwritten"}"`)
    expect(__(tokens[99])).toMatchInlineSnapshot(`"{"type":"HTMLEndTagOpen","range":[431,434],"loc":{"start":{"line":17,"column":38},"end":{"line":17,"column":41}},"value":"p"}"`)
    expect(__(tokens[100])).toMatchInlineSnapshot(`"{"type":"HTMLTagClose","range":[434,435],"loc":{"start":{"line":17,"column":41},"end":{"line":17,"column":42}},"value":""}"`)
    expect(__(tokens[101])).toMatchInlineSnapshot(`"{"type":"HTMLWhitespace","range":[435,438],"loc":{"start":{"line":17,"column":42},"end":{"line":18,"column":2}},"value":"\\n  "}"`)
    expect(__(tokens[102])).toMatchInlineSnapshot(`"{"type":"Punctuator","loc":{"end":{"column":1,"line":19},"start":{"column":0,"line":19}},"range":[440,441],"value":"}"}"`)
  })

  it('should generate range data correctly for template ESTree nodes', () => {
    const parserOptions: VineESLintParserOptions = {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }
    const { ast } = runParse(sampleSourceCode2, parserOptions)
    const fnBodyStmts = (ast.body[0] as ESLintFunctionDeclaration).body?.body ?? []
    const fnLastStmt = fnBodyStmts[fnBodyStmts.length - 1]
    expect(fnLastStmt?.type).toMatchInlineSnapshot(`"ReturnStatement"`)
    const fnReturnArg = (fnLastStmt as ESLintReturnStatement).argument

    const vTemplateRoot = fnReturnArg as any as VTemplateRoot
    expect(vTemplateRoot.type).toMatchInlineSnapshot(`"VTemplateRoot"`)

    // Find the last 'p' element in the template
    // -2 is because the last whitespace after </p>
    const pElement = vTemplateRoot.children[vTemplateRoot.children.length - 2] as VElement
    expect(pElement.type).toMatchInlineSnapshot(`"VElement"`)
    expect(pElement.name).toMatchInlineSnapshot(`"p"`)

    // get attributes of this 'p' element
    const pAttrs = pElement.startTag.attributes
    expect(pAttrs.length).toBe(1)
    const vTextDirective = pAttrs[0] as VDirective
    expect(vTextDirective.directive).toBe(true)
    expect(vTextDirective.key.name.name).toBe('text')

    expect(__(vTextDirective.range)).toMatchInlineSnapshot(`"[400,416]"`)
    expect(sampleSourceCode2.slice(...vTextDirective.range)).toBe('v-text="content"')
  })
})
