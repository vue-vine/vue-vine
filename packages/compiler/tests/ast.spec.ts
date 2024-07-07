import { describe, expect, it } from 'vitest'
import { parse as babelParse } from '@babel/parser'
import {
  assignmentExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  functionDeclaration,
  identifier,
  memberExpression,
  numericLiteral,
  program,
} from '@babel/types'
import type {
  ExportDefaultDeclaration,
  FunctionDeclaration,
  Identifier,
  VariableDeclaration,
} from '@babel/types'
import {
  findVineCompFnDecls,
  isDescendant,
  isVineMacroOf,
} from '../src/babel-helpers/ast'

function parseForTest(content: string) {
  return babelParse(content, {
    sourceType: 'module',
    plugins: [
      'typescript',
    ],
  })
}

describe('find Vine function component declarations', () => {
  it('should be able to find out all Vine component function', () => {
    const content = `
const Caculator = (props: { expr: string }) => {
  return vine\`
    <div class="blog-post">
      {{ expr }} = {{ eval(expr) }}
    </div>
  \`
}

export default function App() {
  const expr = ref('1 + 1')
  return vine\`
    <input class="input-box" type="text" v-model="title" />
    <BlogPost expr={{ expr }} />
  \`
}
`
    const root = parseForTest(content)

    const foundVCFs = findVineCompFnDecls(root)
    expect(foundVCFs).toHaveLength(2)
    expect(((foundVCFs[0] as VariableDeclaration).declarations[0]?.id as Identifier).name).toBe('Caculator')
    expect(((foundVCFs[1] as ExportDefaultDeclaration).declaration as FunctionDeclaration).id?.name).toBe('App')
  })
})

// issue#100
describe('function component can simply return vine template', () => {
  it('should recongnize a simple function component', () => {
    const content = `const App = () => vine\`<div>Hello Vine</div>\``
    const root = parseForTest(content)
    const foundVCFs = findVineCompFnDecls(root)
    expect(foundVCFs).toHaveLength(1)
    expect(((foundVCFs[0] as VariableDeclaration).declarations[0]?.id as Identifier).name).toBe('App')
  })
})

describe('isDescendant function', () => {
  it('should return true when node and potentialDescendant are the same', () => {
    const node = identifier('a')
    expect(isDescendant(node, node)).toBe(true)
  })

  it('should return true when potentialDescendant is a descendant of node', () => {
    const descendant = identifier('b')
    const node = program([
      functionDeclaration(identifier('a'), [], blockStatement([
        expressionStatement(assignmentExpression('=', descendant, numericLiteral(2))),
      ])),
    ])
    expect(isDescendant(node, descendant)).toBe(true)
  })

  it('should return false when potentialDescendant is not a descendant of node', () => {
    const descendant = identifier('b')
    const node = program([
      functionDeclaration(identifier('a'), [], blockStatement([
        expressionStatement(assignmentExpression('=', identifier('c'), numericLiteral(2))),
      ])),
    ])
    expect(isDescendant(node, descendant)).toBe(false)
  })
})

describe('vine ast operations and search helpers', () => {
  it('isVineMacroOf', () => {
    expect(isVineMacroOf('vineProp')(callExpression(identifier('vineProp'), []))).toBe(true)
    expect(isVineMacroOf('vineProp')(
      callExpression(
        memberExpression(
          identifier('vineProp'),
          identifier('validator'),
        ),
        [],
      ),
    )).toBe(true)
    expect(isVineMacroOf('vineProp')(
      callExpression(
        memberExpression(
          identifier('vineProp'),
          identifier('default'),
        ),
        [],
      ),
    )).toBe(true)
    expect(isVineMacroOf('vineStyle')(
      callExpression(
        memberExpression(
          identifier('vineStyle'),
          identifier('scoped'),
        ),
        [],
      ),
    )).toBe(true)
  })
})
