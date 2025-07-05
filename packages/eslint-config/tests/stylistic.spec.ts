import antfu from '@antfu/eslint-config'
import { prettierSnapshot } from '@vue-vine/eslint-plugin'
import { run } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'
import VueVine from '../src'

const configs = await antfu(
  {
    stylistic: true,
  },
  ...VueVine(),
).toConfigs()

run({
  name: 'Compatible with vue-vine/format-vine-template',
  verifyAfterFix: true,
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  configs,
  valid: [
    {
      description: 'Correct sample of style/indent',
      code: `
export function TestComp(_props: {
  foo: string
  bar: number
}) {
  return 'Hello'
}\n`.trimStart(),
      filename: 'test.ts',
    },
  ],
  invalid: [
    {
      description: 'should correctly fix props type object literal fields indent in vine TS file',
      code: `
export function TestComp(props: {
foo: string
bar: number
}) {
  return vine\`
<div>
     HelloWorld
  </div>
    <!-- TEST COMMENT -->
    <p
>Chaos</p>
\`
}\n`.trim(),
      filename: 'test.vine.ts',
      output(result) {
        // This test demonstrates a known compatibility issue
        // between Vue Vine ESLint parser and @stylistic's 'style/indent'.
        // The indent of props type object literal fields is not correctly fixed.
        expect(prettierSnapshot(result)).toBe(`
 ┌────┬────────────────────────────────
 │  1 │export function TestComp(props: {
 │  2 │  foo: string
 │  3 │  bar: number
 │  4 │}) {
 │  5 │  return vine\`
 │  6 │    <div>HelloWorld</div>
 │  7 │    <!-- TEST COMMENT -->
 │  8 │    <p>Chaos</p>
 │  9 │  \`
 │ 10 │}
 │ 11 │
 └────┴────────────────────────────────
  `.trim())
      },
    },
    {
      description: 'should correctly fix content indent inside vine template',
      code: `
export function TestComp() {
return vine\`
  <div>
    <p>Hello</p>
  </div>
\`
}\n`.trimStart(),
      filename: 'test.vine.ts',
      output(result) {
        expect(prettierSnapshot(result)).toBe(`
 ┌───┬────────────────────────────────
 │ 1 │export function TestComp() {
 │ 2 │  return vine\`
 │ 3 │    <div>
 │ 4 │      <p>Hello</p>
 │ 5 │    </div>
 │ 6 │  \`
 │ 7 │}
 │ 8 │
 └───┴────────────────────────────────
  `.trim())
      },
    },
  ],
})
