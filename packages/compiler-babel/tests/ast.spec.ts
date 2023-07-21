import { describe, expect, test } from 'vitest'
import { parse as babelParse } from '@babel/parser'
import {
  type FunctionDeclaration,
  type Identifier,
  type VariableDeclaration,
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
import {
  findVineCompFnDecls,
  isDescendant,
  isVineMacroOf,
} from '../src/babel-ast'

describe('find Vine Function Component Declarations', () => {
  test('should be able to find out all Vine component function', () => {
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
    const root = babelParse(content, {
      sourceType: 'module',
      plugins: [
        'typescript',
      ],
    })

    const foundVCFs = findVineCompFnDecls(root)
    expect(foundVCFs).toHaveLength(2)
    expect(((foundVCFs[0] as VariableDeclaration).declarations[0]?.id as Identifier).name).toBe('Caculator')
    expect((foundVCFs[1] as FunctionDeclaration).id?.name).toBe('App')
  })
})

describe('isDescendant function', () => {
  test('should return true when node and potentialDescendant are the same', () => {
    const node = identifier('a')
    expect(isDescendant(node, node)).toBe(true)
  })

  test('should return true when potentialDescendant is a descendant of node', () => {
    const descendant = identifier('b')
    const node = program([
      functionDeclaration(identifier('a'), [], blockStatement([
        expressionStatement(assignmentExpression('=', descendant, numericLiteral(2))),
      ])),
    ])
    expect(isDescendant(node, descendant)).toBe(true)
  })

  test('should return false when potentialDescendant is not a descendant of node', () => {
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
  test('isVineMacroOf', () => {
    expect(isVineMacroOf('vineProp')(callExpression(identifier('vineProp'), []))).toBe(true)
    expect(isVineMacroOf('vineProp')(
      callExpression(
        memberExpression(
          identifier('vineProp'),
          identifier('validator'),
        ), [],
      ),
    )).toBe(true)
    expect(isVineMacroOf('vineProp')(
      callExpression(
        memberExpression(
          identifier('vineProp'),
          identifier('default'),
        ), [],
      ),
    )).toBe(true)
    expect(isVineMacroOf('vineStyle')(
      callExpression(
        memberExpression(
          identifier('vineStyle'),
          identifier('scoped'),
        ), [],
      ),
    )).toBe(true)
  })
})
