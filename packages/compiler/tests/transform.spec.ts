import { describe, expect, test } from 'vitest'
import { format } from 'prettier'
import { compileVineTypeScriptFile } from '../index'
import { createMockTransformCtx } from './shared-utils'

const testContent = `
function MyProfile() {
  const name = vineProp<string>()
  const age = vineProp.withDefault<number>(18)
  const bio = vineProp.optional<string>()

  const textColor = ref('#1c1c1c')
  const handleRefresh = () => {
    // ...
  }

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

describe('Test transform', () => {
  test('inline mode output result', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(testContent, 'testTransformInlineResult', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformInlineResult')
    const transformed = fileCtx?.fileSourceCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
  })

  test('separated mode output result', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx({
      inlineTemplate: false,
    })
    compileVineTypeScriptFile(testContent, 'testTransformSeparatedResult', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('testTransformSeparatedResult')
    const transformed = fileCtx?.fileSourceCode.toString() ?? ''
    const formated = await format(
      transformed,
      { parser: 'babel-ts' },
    )
    expect(formated).toMatchSnapshot()
  })
})
