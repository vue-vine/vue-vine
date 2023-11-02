import { describe, expect, test } from 'vitest'
import { typescriptBasicESLintParse } from '../src/parse'
import { handleVineTemplateNode, processVineTemplateNode } from '../src/template/process-vine-template-node'

describe('Vine ESLint parser test', () => {
  test('[DEV ONLY] Playground', () => {
    const sampleSourceCode = `
function MyComp() {
  const r1 = ref(Math.random() * 10)
  const r2 = ref(Math.random() * 100)
  const rArr = Array.from({ length: 10 }, () => Math.random() * 100)
  const f1 = () => {
    console.log('f1: hello')
  }

  return vine\`
    <div class="my-comp" :class="r1 > 5 ? 'bg-red' : 'bg-blue'">
      <p v-if="r2 > 50">r2 is greater than 50</p>
      <p v-else>r2 is less than 50</p>
      <ul class="num-list">
        <li v-for="r of rArr" :key="r">{{ r }}</li>
      </ul>
      <button @click="f1">Log something ...</button>
    </div>
  \`
}`.trim()

    const { ast } = typescriptBasicESLintParse(sampleSourceCode, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    })
    expect(ast).toMatchSnapshot()

    const procResult = processVineTemplateNode(
      ast,
      {},
      handleVineTemplateNode,
    )
    if (procResult) {
      const {
        templateStartLine,
        templateStartColumn,
        templateStartOffset,
        templateEndOffset,
        inTemplateTokenList,
      } = procResult
      expect([templateStartOffset, templateEndOffset]).toEqual([233, 546])
      expect([templateStartLine, templateStartColumn]).toEqual([9, 14])
      expect(inTemplateTokenList).toMatchSnapshot()
    }
  })
})
