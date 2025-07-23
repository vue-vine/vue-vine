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

  it('should be able to correctly add suffix to template in volar environment', async () => {
    const shouldBeSuffixedSamples = [
      '<div',
      '<MyComp',
      '<my-comp',
      '<div class="foo"',
      '<div\n  class="foo"',
      '<div id="app" class="container"',
      '<div class="a" \n v-if="b"',
    ]

    const shouldNotBeSuffixedSamples = [
      '<div>',
      '<div />',
      '<div class="foo"> bar',
      'const a = 1 < 2',
      '<',
      '<MyComp></MyComp>',
      '',
      'abc',
      ' <',
    ]

    const runTest = (template: string, compilerOptions: any) => {
      const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx(compilerOptions)
      const content = `
function MyComp() {
  return vine\`${template}\`
}
    `
      compileVineTypeScriptFile(content, 'test-volar-suffix', { compilerHooks: mockCompilerHooks })
      const fileCtx = mockCompilerCtx.fileCtxMap.get('test-volar-suffix')
      return fileCtx?.vineCompFns[0].templateSource ?? ''
    }

    // Test with volar: true
    for (const sample of shouldBeSuffixedSamples) {
      const updatedSource = runTest(sample, {
        envMode: 'development',
        volar: true,
      })
      expect(updatedSource).toBe(`${sample}>`)
    }

    for (const sample of shouldNotBeSuffixedSamples) {
      const updatedSource = runTest(sample, {
        envMode: 'development',
        volar: true,
      })
      expect(updatedSource).toBe(sample)
    }

    // Test with volar: false
    for (const sample of shouldBeSuffixedSamples) {
      const updatedSource = runTest(sample, {
        envMode: 'development',
        volar: false,
      })
      expect(updatedSource).toBe(sample)
    }
  })

  it('should transform asset url src & srcset', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      envMode: 'development',
    })
    const specContent = `
function MyComp() {
  return vine\`
    <img src="@/assets/sample.png" alt="sample-src" />
    <img srcset="@/assets/sample.png 1x, @/assets/sample@2x.png 2x" alt="sample-srcset" />
  \`
}

function MyVaporCompOne() {
  return vine.vapor\`
    <img src="@/vapor-assets/test.png" alt="vapor-sample-src" />
    <img srcset="@/vapor-assets/test.png 1x, @/vapor-assets/test@2x.png 2x" alt="vapor-sample-srcset" />
  \`
}

function MyVaporCompTwo() {
  'use vapor'
  return vine.vapor\`
    <div>This is another vapor component</div>
  \`
}
    `
    compileVineTypeScriptFile(specContent, 'testTransformAssetUrlSrcSet', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)

    const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformAssetUrlSrcSet')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
  })
})
