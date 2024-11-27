import { format } from 'prettier'
import { describe, expect, it } from 'vitest'
import { compileVineTypeScriptFile } from '../src/index'
import { createMockTransformCtx } from './shared-utils'

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
  vineStyle.import('../styles/test1.less').scoped()
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

export function MyComp() {
  const count = ref(0)
  return vine\`
    <div>{{ count.value }}</div>
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
        toDisplayString as _toDisplayString,
        openBlock as _openBlock,
        createElementBlock as _createElementBlock,
        defineComponent as _defineComponent,
        useCssVars as _useCssVars,
      } from "vue";

      import { ref, Ref } from "vue";

      export const MyComp = (() => {
        const __vine = _defineComponent({
          name: "MyComp",
          /* No props */
          /* No emits */
          setup(__props, { expose: __expose }) {
            __expose();
            const props = __props;
            const count = ref(0);

            return { count, MyComp };
          },
        });
        function __sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
          return (
            _openBlock(),
            _createElementBlock(
              "div",
              null,
              _toDisplayString($setup.count.value),
              1 /* TEXT */,
            )
          );
        }
        __vine.render = __sfc_render;

        __vine.__hmrId = "01d6e3a5";

        return __vine;
      })();

      typeof __VUE_HMR_RUNTIME__ !== "undefined" &&
        __VUE_HMR_RUNTIME__.createRecord(MyComp.__hmrId, MyComp);
      export const _rerender_only = false;
      export const _rerender_vcf_fn_name = "";
      import.meta.hot?.accept((mod) => {
        if (!mod) {
          return;
        }
        const { _rerender_only, _rerender_vcf_fn_name } = mod;
        if (!_rerender_vcf_fn_name) {
          return;
        }
        const component = mod[_rerender_vcf_fn_name];
        if (_rerender_only) {
          __VUE_HMR_RUNTIME__.rerender(component.__hmrId, component.render);
        } else {
          __VUE_HMR_RUNTIME__.reload(component.__hmrId, component);
        }
      });
      "
    `)
  })
})
