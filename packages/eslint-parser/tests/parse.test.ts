import { describe, expect, it } from 'vitest'
import type { VineESLintParserOptions } from '../src/types'
import { runParse } from '../src/parse'

describe('vine ESLint parser test', () => {
  it('test variable reference', () => {
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
    expect(ast).toMatchSnapshot()
  })
})
