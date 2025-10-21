import { describe, expect, it } from 'vitest'
import { compileVineTypeScriptFile } from '../src/index'
import { createMockTransformCtx } from './test-utils'

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
    compileVineTypeScriptFile(content, 'testVCFMacroCallOutsideOfVCF', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`1`)
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`
        [
          "Vine macro calls must be inside Vue Vine component function!",
        ]
      `)
  })

  it('validate root scope statements no Vue API call', () => {
    const content = `
const bar = vineProp<number>()
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFRootScopeContainsVueReactivityAPICall', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`1`)
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`
        [
          "Vine macro calls must be inside Vue Vine component function!",
        ]
      `)
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
    compileVineTypeScriptFile(content, 'testVCFHasOnlyOneVineTaggedTemplateString', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`3`)
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`
        [
          "Multiple vine tagged template are not allowed inside Vine component function",
          "Vine template string are not allowed to contain interpolation!",
          "[Vine template compile error] Element is missing end tag.",
        ]
      `)
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
    compileVineTypeScriptFile(content, 'testVCFMacroCallMultipleTimes', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`
        [
          "Multiple \`vineEmits\` calls are not allowed inside Vine component function",
          "Multiple \`vineExpose\` calls are not allowed inside Vine component function",
          "Multiple \`vineOptions\` calls are not allowed inside Vine component function",
          "Multiple \`vineCustomElement\` calls are not allowed inside Vine component function",
        ]
      `)
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

  vineModel()
  const { val } = vineModel<string, Object>(SomeString, SomeOptions)
  const m1 = vineModel()
  const m2 = vineModel({ default: 1 })

  return vine\`
    <div class="box">Test Box</div>
  \`
}
function App(props: { foo: string }) {
  let y, z;
  const color = ref('red');
  vineStyle({ scoped: true }, \`
    .app {
      color: \${color}
    }
  \`)
  y = vineOptions(false)
  vineEmits()
  const x = vineCustomElement()
  z = vineValidators(3)

  vineSlots<{
    default: (props: string) => void; // Valid
    somethingElse: () => void; // Empty is also Valid
  }, number>()

  return vine\`
    <div class="box">Test App</div>
    <Box />
  \`
}
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVineMacrosUsage', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`16`)
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`
        [
          "vineStyle CSS language only supports: \`css\`, \`scss\`, \`sass\`, \`less\`, \`stylus\` and \`postcss\`",
          "Every property of Vue Vine component function's \`vineSlots\` type must be function signature",
          "Function signature of \`vineSlots\` can only have one parameter named \`props\`, and its parameter name must be \`props\`, but got \`yyy\`",
          "Properties of \`vineSlots\` can only have function type annotation",
          "the declaration of \`vineModel\` macro call must be inside a variable declaration",
          "The given vineModel name must be a string literal",
          "the declaration of macro \`vineModel\` call must be an identifier",
          "Vue Vine component function can only have one default model",
          "\`vineStyle\` can only have one string argument'",
          "\`vineEmits\` macro must have a type parameter or an array of string for event names",
          "\`vineSlots\` can only have 1 type parameter",
          "\`vineOptions\` must have one object literal argument",
          "\`vineOptions\` call must be a bare call",
          "\`vineCustomElement\` macro call is not allowed to be inside a variable declaration",
          "\`vineValidators\` must have one object literal argument",
          "\`vineValidators\` call must be a bare call",
        ]
      `)
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
    compileVineTypeScriptFile(content, 'testVineStyleInsideLexicalDeclaration', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`0`)
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`[]`)
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
  function Box({ a, b }: { a: string, b: number }) {
    return vine\`<div>Test Box</div>\`
  }
  function App() {
    const noTypeProp = vineProp()
    const invalidDefault = vineProp.withDefault()
    const emptyValidator = vineProp.optional()

    return vine\`
      <div>
        Hello app
        <Box />
      </div>
    \`
  }
  `
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVineComponentFunctionProps', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`7`)
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`
        [
          "When Vine component function's props type annotation is an object literal, properties' key must be an identifier or a string literal",
          "the declaration of \`vineProp\` macro call must be an identifier",
          "\`vineProp\` macro call must be inside a \`const\` declaration",
          "\`vineProp\` macro call must be inside a \`const\` variable declaration",
          "\`vineProp\` macro call must have a type parameter to specify the prop's type",
          "\`vineProp.withDefault\` macro call must have at least 1 argument",
          "\`vineProp.optional\` macro call must have a type parameter to specify the prop's type",
        ]
      `)
  })

  it('validate vineEmits usage', () => {
    const content = `
function TestComp() {
  const { a } = vineEmits()
  return vine\`<div>Test Comp</div>\`
}`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVineEmitsUsage', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(2)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot(`"\`vineEmits\` macro must have a type parameter or an array of string for event names"`)
    expect(mockCompilerCtx.vineCompileErrors[1].msg)
      .toMatchInlineSnapshot(`"the declaration of macro \`vineEmits\` call must be an identifier"`)
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
    compileVineTypeScriptFile(content, 'testTemplateTopLevelTags', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`2`)
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`
        [
          "[Vine template compile error] Tags with side effect (<script> and <style>) are ignored in client component templates.",
          "[Vine template compile error] Tags with side effect (<script> and <style>) are ignored in client component templates.",
        ]
      `)
  })

  it('should report props destructuring errors', () => {
    const content = `
import { watch } from 'vue'

export function MyComp({
  arr: [a, b, ...c],
  foo = 1,
}: {
  arr: boolean[],
  foo?: number,
}) {

  const testFoo = watch(foo, (newVal) => {
    console.log(newVal)
  })

  return vine\`
    <div> foo: {{ foo }} </div>
  \`
}
    `

    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testPropsDestructuringErrors', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(2)
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`
        [
          "When destructuring props on formal parameter, nested destructuring is not allowed",
          ""foo" is a destructured prop and should not be passed directly to watch(). Pass a getter () => foo instead.",
        ]
      `)
  })

  // https://github.com/vue-vine/vue-vine/issues/321
  it('validate vineSlots with property signature should not report errors', () => {
    const content = `
function TestComp() {
  vineSlots<{
    default: () => any;
    foo: () => any;
  }>()

  return vine\`
    <div>
      <slot />
      <slot name="foo" />
    </div>
  \`
}
`
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVineSlotsPropertySignature', { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    expect(mockCompilerCtx.vineCompileErrors.map(err => err.msg))
      .toMatchInlineSnapshot(`[]`)
  })
})
