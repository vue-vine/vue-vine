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

  test('analyze vine emits definition', () => {
    const content = `
function MyComp() {
  const myEmits = vineEmits<{
    foo: (a: string) => void;
    bar: (b: number) => void;
  }>()
  return vine\`<div>Test emits</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVineEmits', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineEmits')
    expect(fileCtx?.vineFnComps.length).toBe(1)
    const vineFnComp = fileCtx?.vineFnComps[0]
    expect(vineFnComp?.emitsAlias).toBe('myEmits')
    expect(vineFnComp?.emits).toEqual(['foo', 'bar'])
  })

  test('analyze `vineExpose` and `vineOptions` macro calls', () => {
    const content = `
function Comp() {
  const count = ref(1)
  vineExpose({ count })
  vineOptions({
    name: 'MyComp',
    inheritAttrs: false,
  })
  return vine\`<div>Test expose and options</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVineExposeAndOptions', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineExposeAndOptions')
    expect(fileCtx?.vineFnComps.length).toBe(1)
    const vineFnComp = fileCtx?.vineFnComps[0]
    expect(vineFnComp?.expose).toMatchSnapshot()
    expect(vineFnComp?.options).toMatchSnapshot()
  })
})
