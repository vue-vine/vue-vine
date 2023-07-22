import { describe, expect, test } from 'vitest'
import { compileVineTypeScriptFile } from '../index'
import { createMockTransformCtx } from './shared-utils'

describe('Test Vine compiler analyze', () => {
  test('analyze imports', () => {
    const content = `
import { ref, reactive as VueReactive } from 'vue'
import * as Something from 'lib-1'
import type { SomeType } from 'types-2'
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeImports', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeImports')
    expect(fileCtx?.userImports).toMatchInlineSnapshot(`
      {
        "SomeType": {
          "isType": true,
          "source": "types-2",
        },
        "Something": {
          "isNamespace": true,
          "isType": false,
          "source": "lib-1",
        },
        "VueReactive": {
          "isType": false,
          "source": "vue",
        },
        "ref": {
          "isType": false,
          "source": "vue",
        },
      }
    `)
  })

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

  test('analyze vine component function\'s Vue bindings type', () => {
    const content = `
import { ref, reactive } from 'vue'

const MyOutsideVar = 1
function MyOutSideFunc() {
  console.log('outside func')
}
class MyOutsideClass {
  constructor() {
    console.log('outside class')
  }
}
enum MyOutsideEnum {
  A = 1,
  B = 2,
}

function MyComp() {
  const prop1 = vineProp.optional<string>()
  const count = ref(1)
  const state = reactive({
    name: 'vine',
    age: 1,
  })

  return vine\`
    <div>
      Test Vue bindings type
    </div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVineVueBindingsType', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineVueBindingsType')
    const vineFnComp = fileCtx?.vineFnComps[0]
    expect(vineFnComp?.bindings).toMatchInlineSnapshot(`
      {
        "MyComp": "literal-const",
        "MyOutSideFunc": "literal-const",
        "MyOutsideClass": "literal-const",
        "MyOutsideVar": "literal-const",
        "count": "setup-ref",
        "prop1": "setup-ref",
        "reactive": "setup-const",
        "ref": "setup-const",
        "state": "setup-reactive-const",
      }
    `)
  })
})
