import { describe, expect, test } from 'vitest'
import { ts } from '@ast-grep/napi'

/**
 * Why we need this playground?
 *
 * ast-grep's online playground is dependent on WASM API,
 * while `@ast-grep/napi` is dependent on `tree-sitter` native.
 *
 * So the actual running result is subject to here.
 */

describe('AST grep playground', () => {
  const { parse } = ts

  test('TypeScript satisfies expression', () => {
    const root = parse('const foo = bar satisfies Bar').root()
    expect(root.child(0)!.kind()).toMatchInlineSnapshot('"lexical_declaration"')

    const lexDecl = root.child(0)!
    const varDeclarators = lexDecl.children().slice(1)
    expect(varDeclarators.length).toBe(1)

    const varDeclValue = varDeclarators[0].field('value')
    expect(varDeclValue).not.toBe(undefined)
    expect(varDeclValue!.kind()).toMatchInlineSnapshot('"satisfies_expression"')
  })

  test('Align to babel TSInstantiationExpression', () => {
    const root = parse(`
      const inst1 = foo<string>;
      const inst2 = bar<number>
    `).root()
    const stmt1 = root.child(0)!
    const stmt2 = root.child(1)!

    expect(stmt1.text().endsWith(';')).toBe(true)
    expect(stmt2.text().endsWith(';')).toBe(false)

    const patternNoSemi = 'const $VAR = $EXPR<$TYPE>'
    const patternWithSemi = `${patternNoSemi};`

    const s1TryHasSemi = stmt1.find(patternWithSemi)
    const s1TryNoSemi = stmt1.find(patternNoSemi)

    const s2TryHasSemi = stmt2.find(patternWithSemi)
    const s2TryNoSemi = stmt2.find(patternNoSemi)

    expect(s1TryHasSemi).not.toBe(null)
    expect(s1TryNoSemi).toBe(null)

    expect(s2TryHasSemi).toBe(null)
    expect(s2TryNoSemi).not.toBe(null)

    // Due to tree-sitter restriction for now,
    // there's no corresponding node align with babel TSInstantiationExpression
    // we can just use pattern to match.
    // And only using this pattern is not accurate enough.
  })
})
