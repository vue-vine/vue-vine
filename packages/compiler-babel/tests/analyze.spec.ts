import { describe, expect, test } from 'vitest'
import { compileVineTypeScriptFile } from '../index'
import { createMockTransformCtx } from './shared-utils'

describe('Test Vine compiler analyze', () => {
  test('analyze vine component props by function\'s formal param', () => {
    const content = `
function MyComp(p: {
  name: string;
  data: SomeExternalType;
  bool: boolean;
}) {
  return vine\`<div>Test props by formal param</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVinePropsByFormalParam', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVinePropsByFormalParam')
    expect(fileCtx?.vineFnComps.length).toBe(1)
    const vineFnComp = fileCtx?.vineFnComps[0]
    expect(vineFnComp?.propsAlias).toBe('p')
    expect(vineFnComp?.props).toMatchInlineSnapshot(`
      {
        "bool": {
          "isBool": true,
          "isFromMacroDefine": false,
          "isRequired": true,
        },
        "data": {
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": true,
        },
        "name": {
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": true,
        },
      }
    `)
  })

  test('analyze vine component props by macro calls', () => {
    const content = `
const MyComp = () => {
  const name = vineProp<string>()
  const disabled = vineProp.optional<boolean>()
  const title = vineProp.withDefault('# Title', (val: string) => val.startsWith('#'))
  return vine\`<div>Test props by macro calls</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVinePropsByMacroCalls', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVinePropsByMacroCalls')
    expect(fileCtx?.vineFnComps.length).toBe(1)
    const vineFnComp = fileCtx?.vineFnComps[0]
    expect(vineFnComp?.props).toMatchSnapshot()
  })
})
