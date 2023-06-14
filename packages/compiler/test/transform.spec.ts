import { describe, expect, test } from 'vitest'
import type { VineCompilerHooks } from '../index'
import { compileVineTypeScriptFile, createCompilerCtx } from '../index'

function createMockTransformCTX(option = {}) {
  const mockCompilerCtx = createCompilerCtx(option)
  const mockCompilerHook = {
    onOptionsResolved: cb => cb(mockCompilerCtx.options),
    onError: () => {},
    onWarn: () => {},
    onBindFileCtx: (fileId, fileCtx) => mockCompilerCtx.fileCtxMap.set(fileId, fileCtx),
  } as VineCompilerHooks

  return {
    mockCompilerHook,
    mockCompilerCtx,
  }
}

describe('transform vcf containing await', () => {
  test('do not need result', () => {
    const content = 'export async function App() {\n'
      + '  const p = () => new Promise(resolve => setTimeout(resolve))\n'
      + '  await p()\n'
      + '  return vine`\n'
      + '    <div>test</div>\n'
      + '  `\n'
      + '}\n'
    const { mockCompilerHook } = createMockTransformCTX()
    const res = compileVineTypeScriptFile(content, 'testVCFAwait', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    const matchRes = code.match(/await/g)
    expect(matchRes).toBeTruthy()
    expect(matchRes!.length).toBe(1)
    expect(code).toMatchSnapshot()
  })

  test('need result', () => {
    const content = 'export async function App() {\n'
      + '  const p = () => new Promise(resolve => setTimeout(resolve))\n'
      + '  const res = await p()\n'
      + '  return vine`\n'
      + '    <div>test</div>\n'
      + '  `\n'
      + '}\n'
    const { mockCompilerHook } = createMockTransformCTX()
    const res = compileVineTypeScriptFile(content, 'testVCFAwait', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    const matchRes = code.match(/await/g)
    expect(matchRes).toBeTruthy()
    expect(matchRes!.length).toBe(1)
    expect(code).toMatchSnapshot()
  })
})
