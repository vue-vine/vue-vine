import { describe, expect, it } from 'vitest'
import { format } from 'prettier'
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

  vineStyle(\`
    .my-profile {
      padding: 10px;
      margin: 8px;
      color: v-bind(textColor);
    }
  \`)

  return vine\`
    <div class="my-profile">
      <div>{{ name }}<span> - {{ age }}</span></div>
      <p v-show="bio">{{ bio }}</p>
      <button @click="handleRefresh">Refresh</button>
    </div>
  \`
}
function MyApp() {
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
    compileVineTypeScriptFile(testContent, 'testTransformInlineResult', mockCompilerHooks)
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
    compileVineTypeScriptFile(testContent, 'testTransformSeparatedResult', mockCompilerHooks)
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
      mode: 'production',
    })
    compileVineTypeScriptFile(testContent, 'testNoHMRContentOnProduction', mockCompilerHooks)
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
})
