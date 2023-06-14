import { describe, expect, test } from 'vitest'
import type { VineCompilerHooks } from '../index'
import { compileVineTypeScriptFile, createCompilerCtx } from '../index'

function createMockTransformCtx(option = {}) {
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
    const { mockCompilerHook } = createMockTransformCtx()
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
    const { mockCompilerHook } = createMockTransformCtx()
    const res = compileVineTypeScriptFile(content, 'testVCFAwait', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    const matchRes = code.match(/await/g)
    expect(matchRes).toBeTruthy()
    expect(matchRes!.length).toBe(1)
    expect(code).toMatchSnapshot()
  })
})

describe('transform vcf containing valid top level declaration', () => {
  test('should know top level declared names as LITERAL_CONST', () => {
    const content = 'const foo = \'foo\'\n'
    + 'const bar = () => \'lorem\'\n'
    + 'export function App() {\n'
    + '  console.log(foo, bar())\n'
    + '  return vine`\n'
    + '    <div>{{foo}} {{bar()}}</div>\n'
    + '  `\n'
    + '}'
    const { mockCompilerHook } = createMockTransformCtx()
    const res = compileVineTypeScriptFile(content, 'testVCFContainsTopLevelDecl', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code).toMatchSnapshot()
  })
})
