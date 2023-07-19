import { describe, expect, test } from 'vitest'
import type { VineCompilerHooks } from '../index'
import { compileVineTypeScriptFile, createCompilerCtx } from '../index'

function createMockTransformCtx(option = {}) {
  const mockCompilerCtx = createCompilerCtx(option)
  const mockCompilerHook = {
    onOptionsResolved: cb => cb(mockCompilerCtx.options),
    onError: (err) => { mockCompilerCtx.vineCompileErrors.push(err) },
    onWarn: (warn) => { mockCompilerCtx.vineCompileWarnings.push(warn) },
    onBindFileCtx: (fileId, fileCtx) => mockCompilerCtx.fileCtxMap.set(fileId, fileCtx),
  } as VineCompilerHooks

  return {
    mockCompilerHook,
    mockCompilerCtx,
  }
}

describe('test vine compiler validation', () => {
  test('vineStyle must not be inside a lexical declaration', () => {
    const content = `
function App() {
  const foo = vineStyle(\`
    .foo {
      color: red;
    }
  \`)
  return vine\`
    <div>Hello</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHook } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFVineStyleInLexicalDeclaration', mockCompilerHook)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"vineStyle call must not be a lexical declaration!"')
  })

  test('macro call outside of vcf is not allowed', () => {
    const content = `
const foo = vineProp()
function App() {
  return vine\`
    <div>Hello</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHook } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFMacroCallOutsideOfVCF', mockCompilerHook)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Vine macro calls must be inside Vue Vine function component!"')
  })

  test('root scope statements cannot contains Vue reactivity API call', () => {
    const content = `
const bar = ref(1)
`
    const { mockCompilerCtx, mockCompilerHook } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFRootScopeContainsVueReactivityAPICall', mockCompilerHook)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Vue reactivity API ref is not allowed in root top level scope!"')
  })

  test('only listed kind of root scope statements are allowed', () => {
    const content = `
here_is_a_function_call_expression();
`
    const { mockCompilerCtx, mockCompilerHook } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFRootScopeContainsVueReactivityAPICall', mockCompilerHook)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Invalid statement (kind: expression_statement) in root top level scope!"')
  })

  test('vine tagged template string can only be called once inside a vine function component', () => {
    const content = `
function App() {
  const tmpl1 = vine\`
    <div>Hello</div>
  \`
  const tmpl2 = vine\`
    <div>World</div>
  \`
  return tmpl1
}`
    const { mockCompilerCtx, mockCompilerHook } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFVineTaggedTemplateStringCalledTwice', mockCompilerHook)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Multiple `vine tagged template string` calls are not allowed inside Vue Vine function component"')
  })

  test('Check macro call (not includes vineProp), at most once, and check arguments for `vineOptions` & `vineExpose`', () => {
    const content = `
function App() {
  const foo = vineOptions()
  const bar = vineOptions()
  const baz = vineExpose()
  return vine\`
    <div>Hello {{ foo }}</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHook } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFMacroCallNotIncludesVineProp', mockCompilerHook)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(3)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Missing argument for `vineExpose`"')
    expect(mockCompilerCtx.vineCompileErrors[1].msg)
      .toMatchInlineSnapshot('"Multiple `vineOptions` calls are not allowed inside Vue Vine function component"')
    expect(mockCompilerCtx.vineCompileErrors[2].msg)
      .toMatchInlineSnapshot('"Missing argument for `vineOptions`"')
  })

  test('vine tagged template string must not contain expression interpolation', () => {
    const content = `
function App() {
  const foo = 'foo'
  return vine\`
    <div>Hello \${foo}</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHook } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFVineTaggedTemplateStringContainsExpressionInterpolation', mockCompilerHook)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Template string interpolation is not allowed inside Vue Vine template!"')
  })

  test('if defined props by formal parameter, its type annotation must be object literal', () => {
    const content = `
function App(props: SomeExternalType<number>) {
  return vine\`
    <div>Hello {{ foo }}</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHook } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFDefinedPropsTypeAnnotationMustBeObjectLiteral', mockCompilerHook)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
    expect(mockCompilerCtx.vineCompileErrors[0].msg)
      .toMatchInlineSnapshot('"Vue Vine function component props type must be object literal!"')
  })

  test('vineEmits must have one object literal type definition', () => {
    const content = `
function App() {
  const emits = vineEmits()
  return vine\`
    <div>Hello {{ foo }}</div>
  \`
}`
    const { mockCompilerCtx, mockCompilerHook } = createMockTransformCtx()
    compileVineTypeScriptFile(content, 'testVCFVineEmitsMustHaveTypeDefinition', mockCompilerHook)
    expect(mockCompilerCtx.vineCompileErrors.length).toBe(1)
  })
})
