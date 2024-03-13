import { describe, expect, it } from 'vitest'
import { compileVineTypeScriptFile } from '../index'
import { createMockTransformCtx } from './shared-utils'

describe('test Vine compiler validate', () => {
  it('validate no outside macro calls', () => {
    const content = `
const foo = vineProp()
function App() {
  return vine\`
    <div>Hello</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFMacroCallOutsideOfVCF', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Vine macro calls must be inside Vue Vine component function!"')
  })

  it('validate root scope statements no Vue API call', () => {
    const content = `
const bar = ref(1)
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFRootScopeContainsVueReactivityAPICall', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Vue API calls are not allowed to be called in Vine root scope!"')
  })

  it('validate root scope statements\' type are matched with our restrictions', () => {
    const content = `
here_is_a_function_call_expression();
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFRootScopeAllowedStatements', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Invalid root scope statements must be inside Vue Vine component function!"')
  })

  it('validate vine tagged template string usage', () => {
    const content = `
function App() {
  const name = ref('xxx')
  const tmpl1 = vine\`
    <div>Hello</div>
  \`
  return vine\`
    <div>World \${name}</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFHasOnlyOneVineTaggedTemplateString', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(3)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Multiple vine tagged template are not allowed inside Vine component function"')
    expect(mockCompilerCtx.vineCompileErrors[1].msg)
      .toMatchInlineSnapshot('"Vine template string are not allowed to contain interpolation!"')
    expect(mockCompilerCtx.vineCompileErrors[2].msg)
      .toMatchInlineSnapshot('"[Vine template compile error] Element is missing end tag."')
  })

  it('validate those macros can only be called once inside a Vine component function', () => {
    const content = `
function App() {
  const name = ref('xxx')
  const age = ref(18)
  vineStyle('.app { color: red; }')
  vineStyle('.other { color: blue; }')

  vineOptions({ inheritAttrs: false })
  vineOptions({ inheritAttrs: true })

  vineExpose({ name })
  vineExpose({ age })

  vineEmits<{ click: (e: MouseEvent) => void }>()
  vineEmits<{ mouseover: (e: MouseEvent) => void }>()

  vineCustomElement('my-box')
  vineCustomElement('my-app')

  return vine\`
    <div>Test call multiple times</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFMacroCallMultipleTimes', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(5)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Multiple `vineStyle` calls are not allowed inside Vine component function"')
    expect(mockCompilerCtx.vineCompileErrors[1].msg)
      .toMatchInlineSnapshot('"Multiple `vineEmits` calls are not allowed inside Vine component function"')
    expect(mockCompilerCtx.vineCompileErrors[2].msg)
      .toMatchInlineSnapshot('"Multiple `vineExpose` calls are not allowed inside Vine component function"')
    expect(mockCompilerCtx.vineCompileErrors[3].msg)
      .toMatchInlineSnapshot('"Multiple `vineOptions` calls are not allowed inside Vine component function"')
    expect(mockCompilerCtx.vineCompileErrors[4].msg)
      .toMatchInlineSnapshot('"Multiple `vineCustomElement` calls are not allowed inside Vine component function"')
  })

  it('validate vine macro usage (except vineProp)', () => {
    const content = `
function Box() {
  vineStyle(tailwind\`
    .box {
      @apply mt-3;
    }
  \`)

  vineSlots<{
    default: (props: string) => void;
    header(yyy: { case: number }): void;
    footer: Boolean;
  }>()

  return vine\`
    <div class="box">Test Box</div>
  \`
}
function App() {
  const color = ref('red');
  vineStyle({ scoped: true }, \`
    .app {
      color: \${color}
    }
  \`)
  vineOptions(false)
  vineExpose(color)
  vineEmits()
  const x = vineCustomElement()

  vineSlots<{
    default: (props: string) => void;
  }, number>()

  return vine\`
    <div class="box">Test App</div>
    <Box />
  \`
}
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVineMacrosUsage', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot('11')
    expect(mockCompilerCtx.vineCompileErrors[0].msg).toMatchInlineSnapshot('"vineStyle CSS language only supports: `css`, `scss`, `sass`, `less`, `stylus` and `postcss`"')
    expect(mockCompilerCtx.vineCompileErrors[1].msg).toMatchInlineSnapshot('"Every property of Vue Vine component function\'s `vineSlots` type must be function signature"')
    expect(mockCompilerCtx.vineCompileErrors[2].msg).toMatchInlineSnapshot('"Function signature of `vineSlots` can only have one parameter named `props`, and its type annotation must be object literal"')
    expect(mockCompilerCtx.vineCompileErrors[3].msg).toMatchInlineSnapshot('"Function signature of `vineSlots` definition can only have one parameter named `props`, and its parameter name must be `props`, but got `yyy`"')
    expect(mockCompilerCtx.vineCompileErrors[4].msg).toMatchInlineSnapshot('"Properties of `vineSlots` can only have function type annotation"')
    expect(mockCompilerCtx.vineCompileErrors[5].msg).toMatchInlineSnapshot('"`vineCustomElement` macro call is not allowed to be inside a variable declaration"')
    expect(mockCompilerCtx.vineCompileErrors[6].msg).toMatchInlineSnapshot('"`vineStyle` can only have one string argument\'"')
    expect(mockCompilerCtx.vineCompileErrors[7].msg).toMatchInlineSnapshot('"`vineEmits` must have 1 type parameter"')
    expect(mockCompilerCtx.vineCompileErrors[8].msg).toMatchInlineSnapshot('"`vineSlots` can only have 1 type parameter"')
    expect(mockCompilerCtx.vineCompileErrors[9].msg).toMatchInlineSnapshot('"`vineExpose` must have one object literal argument"')
    expect(mockCompilerCtx.vineCompileErrors[10].msg).toMatchInlineSnapshot('"`vineOptions` must have one object literal argument"')
  })

  it('validate vineStyle can not be inside a lexical declaration', () => {
    const content = `
function App() {
  const style = vineStyle.scoped(\`
    .app {
      color: red;
    }
  \`)
  return vine\`
    <div class="app">Test App</div>
  \`
}
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVineStyleInsideLexicalDeclaration', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"`vineStyle` macro call is not allowed to be inside a variable declaration"')
  })

  it('validate vine component function props', () => {
    const content = `
  function Valid(p: { 'foo-bar'?: number; x: number; y: number; }) {
    return vine\`<span>x + y = {{ x + y }}</span>\`
  }
  function Edge(props: { zig: boolean, zag: number, (a: number, b: number): void; }) {
    return vine\`<div>Edge</div>\`
  }
  function Macro() {
    const { a } = vineProp<string>()
    let b = vineProp<number>()
    vineProp.withDefault(1)
    return vine\`<div>Macro</div>\`
  }
  function Box({ a, b }: SomeExternalType1) {
    return vine\`<div>Test Box</div>\`
  }
  function App(props: SomeExternalType2) {
    const noTypeProp = vineProp()
    const invalidDefault = vineProp.withDefault()
    const emptyValidator = vineProp.optional()

  return vine\`
    <div>
      Hello app
      <Box />
    </div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVineComponentFunctionProps', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(10)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot(
        '"Vine component function\'s props type annotation must be an object literal, only contains properties signature, '
        + 'and all properties\' key must be string literal or identifier"',
      )
    expect(mockCompilerCtx.vineCompileErrors[1].msg)
      .toMatchInlineSnapshot('"the declaration of `vineProp` macro call must be an identifier"')
    expect(mockCompilerCtx.vineCompileErrors[2].msg)
      .toMatchInlineSnapshot('"`vineProp` macro call must be inside a `const` declaration"')
    expect(mockCompilerCtx.vineCompileErrors[3].msg)
      .toMatchInlineSnapshot('"`vineProp` macro call must be inside a `const` variable declaration"')
    expect(mockCompilerCtx.vineCompileErrors[4].msg)
      .toMatchInlineSnapshot('"If you\'re defining a Vine component function\'s props with formal parameter, it must be one and only identifier"')
    expect(mockCompilerCtx.vineCompileErrors[5].msg)
      .toMatchInlineSnapshot('"Vine component function\'s props type annotation must be an object literal"')
    expect(mockCompilerCtx.vineCompileErrors[6].msg)
      .toMatchInlineSnapshot('"Vine component function\'s props type annotation must be an object literal"')
    expect(mockCompilerCtx.vineCompileErrors[7].msg)
      .toMatchInlineSnapshot('"`vineProp` macro call must have a type parameter to specify the prop\'s type"')
    expect(mockCompilerCtx.vineCompileErrors[8].msg)
      .toMatchInlineSnapshot('"`vineProp.withDefault` macro call must have at least 1 argument"')
    expect(mockCompilerCtx.vineCompileErrors[9].msg)
      .toMatchInlineSnapshot('"`vineProp.optional` macro call must have a type parameter to specify the prop\'s type"')
  })

  it('validate vineEmits usage', () => {
    const content = `
function TestComp() {
  const { a } = vineEmits()
  return vine\`<div>Test Comp</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVineEmitsUsage', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(2)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"`vineEmits` must have 1 type parameter"')
    expect(mockCompilerCtx.vineCompileErrors[1].msg)
      .toMatchInlineSnapshot('"the declaration of macro call must be an identifier"')
  })

  it('validate template invalid top level tags', () => {
    const content = `
function TestComp() {
  return vine\`
    <template>
      <div>Testing...</div>
    </template>
    <style scoped lang="scss">
      .testing {
        color: red;
      }
    </style>
    <script setup lang="ts">
      console.log('Hello world')
    </script>
  \`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testTemplateTopLevelTags', mockCompilerHooks)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"[Vine template compile error] Tags with side effect (<script> and <style>) are ignored in client component templates."')
  })
})
