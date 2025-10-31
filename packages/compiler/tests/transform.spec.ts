import type { VineCompilerOptions } from '../src/index'
import { format } from 'prettier'
import { describe, expect, it } from 'vitest'
import { compileVineTypeScriptFile } from '../src/index'
import { createMockTransformCtx } from './test-utils'

const testContent = `
import { ref } from 'vue'
import someDefaultExport from 'some-module-1'
import { someNamedExport } from 'some-module-2'
import * as someNamespaceExport from 'some-module-3'
import type { SomeType } from 'some-module-4'
import { someExternalFunction1, someExternalFunction2  } from 'some-module-4'

const v1: SomeType = someExternalFunction1({ a: 1, b: 2 })
const v2 = ref(0)

someExternalFunction2()

export function SampleCustomElement() {
  vineCustomElement()

  return vine\`
    <div>SampleCustomElement</div>
  \`
}

function AnotherComp(props: {
  foo: string;
  bar: number;
}) {
  vineValidators({
    foo: (val: string) => val.startsWith('vine:'),
    bar: (val: number) => val > 5,
  })

  customElements.define('vi-sample-custom-element', SampleCustomElement)

  return vine\`
    <div>AnotherComp</div>
    <p>foo:{{ foo }}</p>
    <p>bar:{{ bar }}</p>
    <vi-sample-custom-element />
  \`
}

function MyProfile() {
  const name = vineProp<string>()
  const age = vineProp.withDefault<number>(18)
  const bio = vineProp.optional<string>()

  const textColor = ref('#1c1c1c')
  const handleRefresh = () => {
    // ...
  }

  const mySlots = vineSlots<{
    default(props: { msg: string }): any
  }>()

  const defaultModelWithValue = vineModel({ default: 'test' })
  const title = vineModel('title', { default: '' })
  const count = vineModel<number>('count')

  vineExpose({
    age,
    bio,
  })

  vineEmits<{
    somethingChange: [string];
  }>()

  vineStyle(\`
    .my-profile {
      padding: 10px;
      margin: 8px;
      color: v-bind(textColor);
    }
  \`)
  vineStyle.scoped(\`
    .bio {
      font-size: 12px;
    }
  \`)
  vineStyle.import.scoped('../styles/test1.less')
  vineStyle.import(\`../styles/test2.scss\`)

  onMounted(async () => {
    const data = await fetch("https://api.sampleapis.com/futurama/characters")
    console.log(data)
  })

  return vine\`
    <div class="my-profile">
      <div>{{ name }}<span> - {{ age }}</span></div>
      <p class="bio" v-show="bio">{{ bio }}</p>
      <button @click="handleRefresh">Refresh</button>
      <img src="@/assets/sample.png" alt="sample" />
    </div>
  \`
}
export default async function MyApp() {
  const data = await fetch("https://api.sampleapis.com/futurama/characters")

  vineStyle.scoped(\`
    .my-app {
      font-size: 16px;
    }
  \`)
  return vine\`
    <div class="my-app">
      <h2>Hello world</h2>
      <MyProfile name="Tomy" :age="24" />
      <AnotherComp foo="vine:hello" bar="10" />
    </div>
  \`
}`

async function getFormatedCodegenResult(
  specContent: string,
  options?: VineCompilerOptions,
) {
  const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
    ...options,
  })
  compileVineTypeScriptFile(specContent, 'testTransformSeparatedResult', { compilerHooks: mockCompilerHooks })
  expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
  const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformSeparatedResult')
  const transformed = fileCtx?.fileMagicCode.toString() ?? ''
  const formated = await format(
    transformed,
    { parser: 'babel-ts' },
  )
  return formated
}

describe('test transform', () => {
  it('inline mode output result', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(testContent, 'testTransformInlineResult', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformInlineResult')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
  })

  it('separated mode output result', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      inlineTemplate: false,
    })
    compileVineTypeScriptFile(testContent, 'testTransformSeparatedResult', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformSeparatedResult')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
  })

  it('separated mode output result by ssr', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      inlineTemplate: false,
    })
    compileVineTypeScriptFile(testContent, 'testTransformSeparatedResult', { compilerHooks: mockCompilerHooks }, true)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformSeparatedResult')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
  })

  it('not output HMR content in non-dev mode', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'production',
    })
    compileVineTypeScriptFile(testContent, 'testNoHMRContentOnProduction', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testNoHMRContentOnProduction')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
    expect(formated.includes('__hmrId')).toBe(false)
    expect(formated.includes('__VUE_HMR_RUNTIME__')).toBe(false)
  })

  // issue#83
  it('should generate hmrId If there is no style', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'development',
    })
    const testContent = `
    export function About() {
      return vine\`
        <div>
          <h2>About page</h2>
        </div>
      \`
    }`
    compileVineTypeScriptFile(testContent, 'testHMRContentOnNoStyle', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testHMRContentOnNoStyle')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
    expect(formated.includes('__hmrId')).toBe(true)
    expect(formated.includes('__VUE_HMR_RUNTIME__')).toBe(true)
  })

  it('should not add unused-in-template imports to returns in separated mode', async () => {
    const specContent = `
import { ref, Ref } from 'vue'
import { foo } from './other' // Vue Vine issue #168

export function MyComp() {
  const count = ref(0)
  return vine\`
    <div @click="foo()">{{ count }}</div>
  \`
}
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      inlineTemplate: false,
    })
    compileVineTypeScriptFile(specContent, 'testUnusedImports', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testUnusedImports')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchInlineSnapshot(`
      "import {
        defineComponent as _defineComponent,
        useCssVars as _useCssVars,
        toDisplayString as _toDisplayString,
        openBlock as _openBlock,
        createElementBlock as _createElementBlock,
      } from "vue";

      import { ref, Ref } from "vue";
      import { foo } from "./other"; // Vue Vine issue #168

      export const MyComp = (() => {
        const __vine = _defineComponent({
          name: "MyComp",
          /* No props */
          /* No emits */
          setup(__props, { expose: __expose }) {
            __expose();
            const props = __props;
            const count = ref(0);

            return {
              count,
              get foo() {
                return foo;
              },
              MyComp,
            };
          },
        });
        function __sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
          return (
            _openBlock(),
            _createElementBlock(
              "div",
              {
                onClick: _cache[0] || (_cache[0] = ($event) => $setup.foo()),
              },
              _toDisplayString($setup.count),
              1 /* TEXT */,
            )
          );
        }
        __vine.render = __sfc_render;
        __vine.__vue_vine = true;
        __vine.__hmrId = "01d6e3a5";

        return __vine;
      })();

      typeof __VUE_HMR_RUNTIME__ !== "undefined" &&
        __VUE_HMR_RUNTIME__.createRecord(MyComp.__hmrId, MyComp);
      "
    `)
  })

  // issue#174
  it('should transform top-level await expressions', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'development',
    })
    const specContent = `
export async function MyComp() {
  await someAsyncFunction()
  const data = await fetch('https://test-api.com')
  window.fooList[await bar()] = true

  useDebounceFn(async () => {
    await doSomeAsync()
  })

  return vine\`
    <div>Test</div>
  \`
}
    `
    compileVineTypeScriptFile(specContent, 'testTransformTopLevelAwait', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformTopLevelAwait')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
  })

  // issue#192
  it('should generate export default in correct position', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'development',
    })
    const specContent = `
export default function MyComp() {
  return vine\`
    <div>Test</div>
  \`
}
    `
    compileVineTypeScriptFile(specContent, 'testExportDefaultInCorrectPosition', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testExportDefaultInCorrectPosition')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
  })

  // discussion#199
  it('should transform destructured props', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'development',
    })
    const specContent = `
import { ref, watch } from 'vue'

export function MyComp({
  'foo:zee': fooZee,
  bar = 1,
  arr,
  ...rest
}: {
  'foo:zee': string,
  bar?: number,
  arr: boolean[],
  other1: string,
  other2: number,
}) {

  const test1 = ref(fooZee)
  const test2 = watch(() => bar, (newVal) => {
    console.log(newVal)
  })
  onMounted(() => {
    console.log('other1', rest.other1)
    console.log('other2', rest.other2)
  })

  return vine\`
    <div>{{ name }}</div>
  \`
}
    `
    compileVineTypeScriptFile(specContent, 'testTransformDestructuredProps', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)

    const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformDestructuredProps')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )

    expect(formated).toMatch('const test1 = ref(props["foo:zee"])')
    expect(formated).toMatch('() => props.bar')
    expect(formated).toMatch('const rest = _createPropsRestProxy(__props, ["foo:zee", "bar", "arr"]);')
    expect(formated).toMatchSnapshot()
  })

  it('should not export on function delcaration when already exported in somewhere', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'development',
    })
    const specContent = `
const a = 1;
function MyComp() {
  return vine\`...\`
}

export {
  a,
}
export {
  MyComp,
}
    `

    compileVineTypeScriptFile(specContent, 'testExportOnFunctionDeclaration', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testExportOnFunctionDeclaration')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(fileCtx?.exportNamedDeclarations.length).toMatchInlineSnapshot(`2`)
    expect(formated).toMatchSnapshot()
  })

  it('should transform negative bool props', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'development',
    })
    const specContent = `
function MyComp(props: {
  foo: boolean;
  bar: string;
}) {
  return vine\`
    <div v-show="foo">
      <p>bar: {{ bar }}</p>
    </div>
  \`
}

export function App() {
  return vine\`
    <MyComp !foo bar="hello" />
    <MyComp foo bar="world" />
  \`
}
    `

    compileVineTypeScriptFile(specContent, 'testTransformNegativeBoolProps', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformNegativeBoolProps')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
  })

  it('should generate top level declaration bindings in setup returns', async () => {
    const specContent = `
import { ref } from 'vue'
import { magicFn1, magicFn2 } from './other'

export const [x, y] = magicFn1()
export const arrowFunc = () => { console.log('arrow func') }
export function plainFunc() { console.log('plain func') }
class MyClass {
  constructor() { console.log('class constructor') }
  num() { return Math.random() * 100 }
  static getFoo() { return 'foo' }
}
export enum MyEnum {
  A = 1,
}
const myInstance = new MyClass()
let myLet = '111'
export let { a, b } = magicFn2()

function MyComp() {
  const count = ref(1)
  return vine\`
    <div>Test top level declarations {{ count }}</div>
    <ul>
      <li>arrow func = {{ arrowFunc() }}</li>
      <li>plain func = {{ plainFunc() }}</li>
      <li>class = {{ MyClass.getFoo() }}</li>
      <li>enum = {{ MyEnum.A }}</li>
      <li>instance = {{ myInstance.num() }}</li>
      <li>myLet = {{ myLet }}</li>
      <li>x = {{ x }}, y = {{ y }}</li>
      <li>a = {{ a }}, b = {{ b }}</li>
    </ul>
  \`
}
    `
    const inlineModeResult = await getFormatedCodegenResult(specContent, {
      inlineTemplate: true,
    })
    const separatedModeResult = await getFormatedCodegenResult(specContent, {
      inlineTemplate: false,
    })

    expect(inlineModeResult).toMatchSnapshot()
    expect(separatedModeResult).toMatchSnapshot()
  })

  // issue#327
  it('should handle kebab-case props correctly', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'development',
    })
    const specContent = `
export function TestComponent(props: {
  'aria-atomic': boolean;
  'aria-busy': boolean;
  'data-test-id': string;
}) {
  return vine\`
    <div v-bind="$props">
      <h1>Test Component</h1>
    </div>
  \`
}
    `

    compileVineTypeScriptFile(specContent, 'testKebabCaseProps', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testKebabCaseProps')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )

    // Check that kebab-case props are quoted in props option
    expect(formated).toMatch(/"aria-atomic":/)
    expect(formated).toMatch(/"aria-busy":/)
    expect(formated).toMatch(/"data-test-id":/)
    expect(formated).toMatchSnapshot()
  })

  it('should handle kebab-case props with defaults correctly', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'development',
    })
    const specContent = `
export function TestComponent({
  'aria-label': ariaLabel = 'default label',
  'data-test-id': dataTestId,
}: {
  'aria-label'?: string,
  'data-test-id': string,
}) {
  return vine\`
    <div>
      <span>{{ ariaLabel }}</span>
      <span>{{ dataTestId }}</span>
    </div>
  \`
}
    `

    compileVineTypeScriptFile(specContent, 'testKebabCasePropsWithDefaults', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testKebabCasePropsWithDefaults')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )

    // Check that kebab-case props are quoted in props option
    expect(formated).toMatch(/"aria-label":/)
    expect(formated).toMatch(/"data-test-id":/)
    // Check that useDefaults handles kebab-case props correctly
    expect(formated).toMatch(/"aria-label":\s*\(\)\s*=>/)
    // Check that destructuring handles kebab-case props correctly
    expect(formated).toMatch(/"aria-label":\s*ariaLabel/)
    expect(formated).toMatch(/"data-test-id":\s*dataTestId/)
    expect(formated).toMatchSnapshot()
  })

  // issue#329
  it.each([
    {
      name: 'arrow function with block statement',
      code: 'export default () => {\n  return vine`<div>Anonymous default export</div>`\n}',
    },
    {
      name: 'arrow function with implicit return',
      code: 'export default () => vine`<div>Anonymous default export</div>`',
    },
    {
      name: 'anonymous function expression',
      code: 'export default function () {\n  return vine`<div>Anonymous default export</div>`\n}',
    },
  ])('should generate correct code for export default anonymous function: $name', async ({ code }) => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(code, 'testExportDefaultAnonymous', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testExportDefaultAnonymous')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(transformed, { parser: 'babel-ts' })

    expect(formated).toContain('const __VineCompDefault = (() => {')
    expect(formated).toContain('export default __VineCompDefault')
    expect(formated).not.toContain('const default =')
    expect(formated).not.toContain('const  =')
    expect(formated).toContain('name: "__VineCompDefault"')
  })
})
