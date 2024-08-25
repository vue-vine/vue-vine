import { describe, expect, it } from 'vitest'
import { compileVineTypeScriptFile } from '../src/index'
import { sortStyleImport } from '../src/style/order'
import type { Nil } from '../src/types'
import { VineBindingTypes } from '../src/constants'
import { createMockTransformCtx } from './shared-utils'

// implement a function for excluding fields of an object
function excludeFields<T extends Record<string, any>, K extends keyof T>(
  obj: T | Nil,
  keys: K[],
): Omit<T, K> {
  if (!obj)
    return {} as Omit<T, K>

  const res = { ...obj }
  keys.forEach((key) => {
    delete res[key]
  })
  return res
}

describe('test Vine compiler analyze', () => {
  it('analyze comps define in separated variable declarators', () => {
    const content = `
const MyComp1 = () => { return vine\`<div>Test MyComp1</div>\` },
      MyComp2 = () => vine\`<div>Test MyComp2</div>\`,
      MyComp3 = function () { return vine\`<div>Test MyComp3</div>\` }
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeMultiCompsDecl', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.get('testAnalyzeMultiCompsDecl')?.vineCompFns).toHaveLength(3)
  })

  it('analyze comps define in export statements', () => {
    const content = `
export function MyComp1() { return vine\`<div>Test MyComp1</div>\` }
export const MyComp2 = () => vine\`<div>Test MyComp2</div>\`
export default function MyComp3() { return vine\`<div>Test MyComp3</div>\` }
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeExportCompsDecl', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.get('testAnalyzeExportCompsDecl')?.vineCompFns).toHaveLength(3)
  })

  it('analyze imports', () => {
    const content = `
import { ref, reactive as VueReactive } from 'vue'
import * as Something from 'lib-1'
import type { SomeType } from 'types-2'
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeImports', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeImports')
    expect(fileCtx?.userImports).toMatchInlineSnapshot(`
      {
        "SomeType": {
          "isType": true,
          "isUsedInTemplate": false,
          "source": "types-2",
        },
        "Something": {
          "isNamespace": true,
          "isType": false,
          "isUsedInTemplate": false,
          "source": "lib-1",
        },
        "VueReactive": {
          "isType": false,
          "isUsedInTemplate": false,
          "source": "vue",
        },
        "ref": {
          "isType": false,
          "isUsedInTemplate": false,
          "source": "vue",
        },
      }
    `)
  })

  it('analyze vine component props by function\'s formal param', () => {
    const content = `
function MyComp(p: {
  name: string;
  data: SomeExternalType;
  bool: boolean;
}) {
  return vine\`<div>Test props by formal param</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVinePropsByFormalParam', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVinePropsByFormalParam')
    expect(fileCtx?.vineCompFns.length).toBe(1)
    const vineFnComp = fileCtx?.vineCompFns[0]
    expect(vineFnComp?.propsAlias).toBe('p')
    expect(vineFnComp?.props).toMatchInlineSnapshot(`
      {
        "bool": {
          "isBool": true,
          "isFromMacroDefine": false,
          "isRequired": true,
          "typeAnnotationRaw": "boolean",
        },
        "data": {
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": true,
          "typeAnnotationRaw": "SomeExternalType",
        },
        "name": {
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": true,
          "typeAnnotationRaw": "string",
        },
      }
    `)
  })

  it('analyze vine component props by macro calls', () => {
    const content = `
const MyComp = () => {
  const name = vineProp<string>()
  const disabled = vineProp.optional<boolean>()
  const title = vineProp.withDefault('# Title', (val: string) => val.startsWith('#'))
  return vine\`<div>Test props by macro calls</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVinePropsByMacroCalls', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVinePropsByMacroCalls')
    expect(fileCtx?.vineCompFns.length).toBe(1)
    const vineFnComp = fileCtx?.vineCompFns[0]
    expect(vineFnComp?.props).toMatchSnapshot()
  })

  it('analyze vine emits definition', () => {
    const content = `
function MyComp() {
  const myEmits = vineEmits<{
    foo: [a: string];
    bar: [b: number];
  }>()
  return vine\`<div>Test emits</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVineEmits', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineEmits')
    expect(fileCtx?.vineCompFns.length).toBe(1)
    const vineFnComp = fileCtx?.vineCompFns[0]
    expect(vineFnComp?.emitsAlias).toBe('myEmits')
    expect(vineFnComp?.emits).toEqual(['foo', 'bar'])
  })

  it('analyze vine slots definition', () => {
    const content = `
function MyComp() {
  const mySlots = vineSlots<{
    default(props: { id: string; msg: string; }): any;
    header: (props: { align: 'left' | 'right' }) => any;
  }>()
  return vine\`<div>Test slots</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVineSlots', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineSlots')
    expect(fileCtx?.vineCompFns.length).toBe(1)
    const vineFnComp = fileCtx?.vineCompFns[0]
    const slots = vineFnComp?.slots
    expect(slots).toMatchSnapshot()
    expect(vineFnComp?.slotsAlias).toBe('mySlots')

    const defaultSlot = slots!.default!
    expect(
      fileCtx?.originCode.slice(
        defaultSlot.props.start!,
        defaultSlot.props.end!,
      ),
    ).toMatchInlineSnapshot('"{ id: string; msg: string; }"')
  })

  it('analyze vineModel definition', () => {
    const content = `
function MyComp() {
  const defaultModelWithValue = vineModel({ default: 'test' })
  const title = vineModel('title', { default: '' })
  const count = vineModel<number>('count')

  return vine\`<div>Test slots</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVineModel', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineModel')
    expect(fileCtx?.vineCompFns.length).toBe(1)
    const vineFnComp = fileCtx?.vineCompFns[0]

    const pickOneModel = (name: string) => {
      return {
        ...excludeFields(
          vineFnComp?.vineModels[name],
          ['modelOptions'],
        ),
        modelOptions: vineFnComp!.vineModels[name].modelOptions
          ? content.slice(
            vineFnComp!.vineModels[name].modelOptions!.start!,
            vineFnComp!.vineModels[name].modelOptions!.end!,
          )
          : undefined,
      }
    }

    expect(
      pickOneModel('modelValue'),
    ).toMatchInlineSnapshot(`
      {
        "modelModifiersName": "modelModifiers",
        "modelOptions": "{ default: 'test' }",
        "varName": "defaultModelWithValue",
      }
    `)
    expect(
      pickOneModel('title'),
    ).toMatchInlineSnapshot(`
      {
        "modelModifiersName": "titleModifiers",
        "modelOptions": "{ default: '' }",
        "varName": "title",
      }
    `)
    expect(
      pickOneModel('count'),
    ).toMatchInlineSnapshot(`
      {
        "modelModifiersName": "countModifiers",
        "modelOptions": undefined,
        "varName": "count",
      }
    `)
  })

  it('analyze `vineExpose` and `vineOptions` macro calls', () => {
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
    compileVineTypeScriptFile(content, 'testAnalyzeVineExposeAndOptions', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.fileCtxMap.size).toBe(1)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineExposeAndOptions')
    expect(fileCtx?.vineCompFns.length).toBe(1)
    const vineFnComp = fileCtx?.vineCompFns[0]
    expect(vineFnComp?.expose).toMatchSnapshot()
    expect(vineFnComp?.options).toMatchSnapshot()
  })

  it('analyze vine component function\'s Vue bindings type', () => {
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

export function MyComp() {
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
    compileVineTypeScriptFile(content, 'testAnalyzeVineVueBindingsType', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineVueBindingsType')
    const vineFnComp = fileCtx?.vineCompFns[0]
    expect(vineFnComp?.bindings).toMatchInlineSnapshot(`
      {
        "MyComp": "setup-const",
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

  it('analyze vine style macro call', () => {
    const content = `
function MyComp() {
  const color = ref('red')
  vineStyle.scoped(scss\`
    .app {
      color: v-bind(color)
    }
  \`)
  return vine\`<div>Test vine style</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVineStyle', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineStyle')
    const vineFnComp = fileCtx?.vineCompFns[0]
    const scopeId = vineFnComp?.scopeId
    if (!scopeId) {
      throw new Error('scopeId should not be empty')
    }
    expect(scopeId).toBe('77af4072')
    expect(vineFnComp?.cssBindings).toEqual({
      color: '7aa07bf2',
    })
    const styleDefines = fileCtx?.styleDefine[scopeId]
    const styleDefine = styleDefines?.[0]
    expect(styleDefine?.lang).toBe('scss')
    expect(styleDefine?.scoped).toBe(true)
  })

  it('analyze vine template', () => {
    const content = `
function MyBox(props: {
  title: string;
}) {
  return vine\`
    <div>
      <h1>{{ title }}</h1>
      <slot />
    </div>
  \`
}
function MyApp() {
  return vine\`
    <MyBox title="Test template">
      <div>Test inner content</div>
    </MyBox>
  \`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testAnalyzeVineTemplate', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testAnalyzeVineTemplate')
    const MyBoxComp = fileCtx?.vineCompFns[0]
    const MyApp = fileCtx?.vineCompFns[1]
    expect(MyBoxComp?.templateAst).toMatchSnapshot()
    expect(MyApp?.templateAst).toMatchSnapshot()
  })

  it('analyze vineProp validator and vineOptions reference locally declared variables', () => {
    const content = `
import { ref } from 'vue'

function MyComp() {
  const prop1 = vineProp<string>(() => {
    return val1.value > 0.5 ? 'A' : 'B'
  })
  vineOptions({
    name: val2.value,
  })

  const val1 = ref(Math.random())
  const val2 = ref('Test')
  return vine\`
    <div>Test reference locally declared variables</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testReferenceLocallyDeclaredVariables', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(2)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot(`"Cannot reference "val1" locally declared variables because it will be hoisted outside of component's setup() function."`)
    expect(mockCompilerCtx.vineCompileErrors[1].msg)
      .toMatchInlineSnapshot(`"Cannot reference "val2" locally declared variables because it will be hoisted outside of component's setup() function."`)
  })

  it('analyze and store vineProp type annotation record', () => {
    const content = `
import { V1 } from './constants'
import type { T1, T2 } from './types'
import { call1, call2 } from './utils'

function MyComp() {
  const p1 = vineProp<string>()
  const p2 = vineProp.withDefault(0)
  const p3 = vineProp.withDefault(V1)
  const p4 = vineProp.withDefault(call1())
  const p5 = vineProp.withDefault<T1>(call2())
  const p6 = vineProp.withDefault(false)
  const p7 = vineProp.optional<T2>()

  return vine\`<div>Test store prop type record</div>\`
}
  `
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testStoreVinePropTypeAnnotation', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testStoreVinePropTypeAnnotation')
    const MyComp = fileCtx?.vineCompFns[0]
    expect(MyComp?.getPropsTypeRecordStr())
      .toMatchInlineSnapshot(`"{ p1: string, p2: number, p3: typeof V1, p4: any, p5: T1, p6: boolean, p7: T2 }"`)
    // expect(mockCompilerCtx.vineCompileWarnings.length).toBe(1)
    // expect(mockCompilerCtx.vineCompileWarnings[0].msg)
    //   .toMatchInlineSnapshot(`"The default value is too complex for Vine compiler to infer its type. Please explicitly give a type paramter for IDE type check."`)
  })
})

describe('test other helpers for compiler', () => {
  it('sort style import', () => {
    const content = `
function MyApp() {
  vineStyle(\`
    .app {
      padding: 10px;
      margin: 8px;
    }
  \`)
  return vine\`
    <div class="app">
      <MyBox />
      <p>Test sort style import</p>
    </div>
  \`
}
function MyBox() {
  vineStyle.scoped(scss\`
    .box {
      color: red;
    }
  \`)
  return vine\`
    <div class="box">
      Test sort style import
    </div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testSortStyleImport', { compilerHooks: mockCompilerHooks })
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testSortStyleImport')
    expect(fileCtx).not.toBeUndefined()
    const sorted = sortStyleImport(fileCtx!)
    expect(sorted).toMatchInlineSnapshot(`
      [
        "import 'testSortStyleImport?type=vine-style&scopeId=939fb36a&comp=MyApp&lang=css&index=0&virtual.css';",
        "import 'testSortStyleImport?type=vine-style&scopeId=939fac16&comp=MyBox&lang=scss&scoped=true&index=0&virtual.scss';",
      ]
    `)
  })

  it('vineEmits should also set in bindings #89', () => {
    const content = `
    function MyComp() {
      const myEmits = vineEmits<{
        foo: [a: string];
        bar: [b: number];
      }>()
      return vine\`<div>Test emits</div>\`
    }`

    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVineEmitsBindings', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.fileCtxMap.get('testVineEmitsBindings')?.vineCompFns[0]?.bindings).toEqual(
      expect.objectContaining({
        myEmits: VineBindingTypes.SETUP_CONST,
      }),
    )
  })
})
