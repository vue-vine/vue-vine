import type { TypeChecker } from 'ts-morph'
import type { VineCompilerHooks, VineCompilerOptions } from '../src'
import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { compileVineTypeScriptFile, createCompilerCtx } from '../src'

function _file(fileId: string, content: string) {
  return {
    fileId,
    content,
  }
}
function createMockTransformCtx(
  fileId: string,
  project: Project,
  typeChecker: TypeChecker,
  option: VineCompilerOptions = {},
) {
  const mockCompilerCtx = createCompilerCtx(option)
  const mockCompilerHooks = {
    getCompilerCtx: () => mockCompilerCtx,
    getTsMorph: () => ({
      project,
      typeChecker,
    }),
    onError: (err) => { mockCompilerCtx.vineCompileErrors.push(err) },
    onWarn: (warn) => { mockCompilerCtx.vineCompileWarnings.push(warn) },
    onBindFileCtx: (fileId, fileCtx) => mockCompilerCtx.fileCtxMap.set(fileId, fileCtx),
  } as VineCompilerHooks

  return {
    mockCompilerHooks,
    mockCompilerCtx,
  }
}
function prepareTsMorphProject(vineFileContent: string) {
  const project = new Project({
    compilerOptions: {
      // Ensure more accurate type analysis
      strict: true,
    },
  })
  const vineFile = _file(
    'test.vine.ts',
    vineFileContent,
  )
  project.createSourceFile(vineFile.fileId, vineFile.content)
  const typeChecker = project.getTypeChecker()

  return {
    project,
    typeChecker,
    vineFile,
  }
}

describe('test ts-morph analysis', () => {
  it('can resolve imported type from external file', () => {
    const { vineFile, project, typeChecker } = prepareTsMorphProject(`
import type { TestProps } from './types'

export function TestVine(props: TestProps) {
  return vine\`
    <div>
      <h3>Title: {{ title }}</h3>
      <h4>Variant: {{ variant }}</h4>
      <p v-if="message">message: {{ message }}</p>
      <p v-if="errorCode">err code: {{ errorCode }}</p>
    </div>
  \`
}
    `)
    project.createSourceFile('types.ts', `
// Define base props
interface BaseProps {
  title: string
}

// Success variant prevents error props
type SuccessProps = BaseProps & {
  variant: 'success'
  message: string
  errorCode?: never // Prevents mixing
}

// Error variant prevents success props
type ErrorProps = BaseProps & {
  variant: 'error'
  errorCode: string
  message?: never // Prevents mixing
}

export type TestProps = SuccessProps | ErrorProps
    `)

    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx(vineFile.fileId, project, typeChecker)
    compileVineTypeScriptFile(vineFile.content, vineFile.fileId, { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`0`)
    expect(mockCompilerCtx.vineCompileWarnings.length).toMatchInlineSnapshot(`0`)
    const fileCtx = mockCompilerCtx.fileCtxMap.get(vineFile.fileId)
    const vineCompFnCtx = fileCtx?.vineCompFns?.find(fn => fn.fnName === 'TestVine')
    expect(vineCompFnCtx).not.toBeUndefined()
    expect(vineCompFnCtx?.props).toMatchInlineSnapshot(`
      {
        "errorCode": {
          "isFromMacroDefine": false,
          "isMaybeBool": false,
          "isRequired": false,
          "nameNeedQuoted": false,
        },
        "message": {
          "isFromMacroDefine": false,
          "isMaybeBool": false,
          "isRequired": false,
          "nameNeedQuoted": false,
        },
        "title": {
          "isFromMacroDefine": false,
          "isMaybeBool": false,
          "isRequired": true,
          "nameNeedQuoted": false,
        },
        "variant": {
          "isFromMacroDefine": false,
          "isMaybeBool": false,
          "isRequired": true,
          "nameNeedQuoted": false,
        },
      }
    `)
  })

  it('can resolve caculated type in current file', () => {
    const { vineFile, project, typeChecker } = prepareTsMorphProject(`
type T1 = {
  a: string
  b?: boolean
}

type T2 = {
  c: number
}

type T3 = (T1['b'] extends boolean ? T1 : never) & Partial<T2> // never

export function TestTsMorph(props: T3) {
  return vine\`
    <div>Test Ts Morph</div>
  \`
}
    `)

    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx(vineFile.fileId, project, typeChecker)
    compileVineTypeScriptFile(vineFile.content, vineFile.fileId, { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`0`)
    expect(mockCompilerCtx.vineCompileWarnings.length).toMatchInlineSnapshot(`0`)
    const fileCtx = mockCompilerCtx.fileCtxMap.get(vineFile.fileId)
    const vineCompFnCtx = fileCtx?.vineCompFns?.find(fn => fn.fnName === 'TestTsMorph')
    expect(vineCompFnCtx).not.toBeUndefined()
    expect(vineCompFnCtx?.props).toMatchInlineSnapshot(`{}`) // 'never' has no fields
  })

  it('can resolve caculated type in current file 2', () => {
    const { vineFile, project, typeChecker } = prepareTsMorphProject(`
type MapType<T> = {
    [
    Key in keyof T
    as \`\${Key & string}\${Key & string}\${Key & string}\`
    ]: [T[Key], T[Key], T[Key]]
}
// {
//   aaa: [1, 1, 1];
//   bbb: [2, 2, 2];
// }
type P = MapType<{ a: 1, b: 2 }>

export function TestTsMorph(props: P) {
  return vine\`
    <div>Test Ts Morph</div>
  \`
}
    `)
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx(vineFile.fileId, project, typeChecker)
    compileVineTypeScriptFile(vineFile.content, vineFile.fileId, { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`0`)
    expect(mockCompilerCtx.vineCompileWarnings.length).toMatchInlineSnapshot(`0`)
    const fileCtx = mockCompilerCtx.fileCtxMap.get(vineFile.fileId)
    const vineCompFnCtx = fileCtx?.vineCompFns?.find(fn => fn.fnName === 'TestTsMorph')
    expect(vineCompFnCtx).not.toBeUndefined()
    expect(vineCompFnCtx?.props).toMatchInlineSnapshot(`
      {
        "aaa": {
          "isFromMacroDefine": false,
          "isMaybeBool": false,
          "isRequired": true,
          "nameNeedQuoted": false,
        },
        "bbb": {
          "isFromMacroDefine": false,
          "isMaybeBool": false,
          "isRequired": true,
          "nameNeedQuoted": false,
        },
      }
    `)
  })

  it('can resolve generics in props type literal', () => {
    const { vineFile, project, typeChecker } = prepareTsMorphProject(`
export function TestGenerics<T extends boolean>(props: {
  foo: T
}) {
  return vine\`
    <div>TestGenerics foo: {{ foo }}</div>
  \`
}
    `)
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx(vineFile.fileId, project, typeChecker)
    compileVineTypeScriptFile(vineFile.content, vineFile.fileId, { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`0`)
    expect(mockCompilerCtx.vineCompileWarnings.length).toMatchInlineSnapshot(`0`)
    const fileCtx = mockCompilerCtx.fileCtxMap.get(vineFile.fileId)
    const vineCompFnCtx = fileCtx?.vineCompFns?.find(fn => fn.fnName === 'TestGenerics')
    expect(vineCompFnCtx).not.toBeUndefined()
    expect(vineCompFnCtx?.props).toMatchInlineSnapshot(`
      {
        "foo": {
          "isFromMacroDefine": false,
          "isMaybeBool": true,
          "isRequired": true,
          "typeAnnotationRaw": "T",
        },
      }
    `)
  })

  it('can resolve implict boolean', () => {
    const { vineFile, project, typeChecker } = prepareTsMorphProject(`
type TEST = string | boolean

declare function getBool(): TEST;

export function TestImplictBoolean() {
  const foo = vineProp.optional<TEST>()
  const bar = vineProp.withDefault(getBool())

  return vine\`
    <div>TestImplictBoolean</div>
    <p>foo: {{ foo }}</p>
    <p>bar: {{ bar }}</p>
  \`
}
    `)
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx(vineFile.fileId, project, typeChecker)
    compileVineTypeScriptFile(vineFile.content, vineFile.fileId, { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`0`)
    expect(mockCompilerCtx.vineCompileWarnings.length).toMatchInlineSnapshot(`0`)
    const fileCtx = mockCompilerCtx.fileCtxMap.get(vineFile.fileId)
    const vineCompFnCtx = fileCtx?.vineCompFns?.find(fn => fn.fnName === 'TestImplictBoolean')
    expect(vineCompFnCtx).not.toBeUndefined()
    expect(vineCompFnCtx?.props.foo.isMaybeBool).toMatchInlineSnapshot(`true`)
    expect(vineCompFnCtx?.props.bar.isMaybeBool).toMatchInlineSnapshot(`true`)
  })

  // issue#327
  it('can handle kebab-case props from external types', () => {
    const { vineFile, project, typeChecker } = prepareTsMorphProject(`
import type { AriaAttributes } from './types'

export function TestComponent(props: AriaAttributes) {
  return vine\`
    <div v-bind="$props">
      <h1>Test Component</h1>
    </div>
  \`
}
    `)
    project.createSourceFile('types.ts', `
export interface AriaAttributes {
  'aria-atomic'?: boolean | 'false' | 'true'
  'aria-busy'?: boolean | 'false' | 'true'
  'aria-label'?: string
  'data-test-id'?: string
}
    `)

    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx(vineFile.fileId, project, typeChecker)
    compileVineTypeScriptFile(vineFile.content, vineFile.fileId, { compilerHooks: mockCompilerHooks })
    expect(mockCompilerCtx.vineCompileErrors.length).toMatchInlineSnapshot(`0`)
    expect(mockCompilerCtx.vineCompileWarnings.length).toMatchInlineSnapshot(`0`)
    const fileCtx = mockCompilerCtx.fileCtxMap.get(vineFile.fileId)
    const vineCompFnCtx = fileCtx?.vineCompFns?.find(fn => fn.fnName === 'TestComponent')
    expect(vineCompFnCtx).not.toBeUndefined()

    // Check that nameNeedQuoted is correctly set for kebab-case props
    expect(vineCompFnCtx?.props['aria-atomic']?.nameNeedQuoted).toBe(true)
    expect(vineCompFnCtx?.props['aria-busy']?.nameNeedQuoted).toBe(true)
    expect(vineCompFnCtx?.props['aria-label']?.nameNeedQuoted).toBe(true)
    expect(vineCompFnCtx?.props['data-test-id']?.nameNeedQuoted).toBe(true)

    // Check that all props are correctly resolved
    expect(vineCompFnCtx?.props).toMatchInlineSnapshot(`
      {
        "aria-atomic": {
          "isFromMacroDefine": false,
          "isMaybeBool": true,
          "isRequired": false,
          "nameNeedQuoted": true,
        },
        "aria-busy": {
          "isFromMacroDefine": false,
          "isMaybeBool": true,
          "isRequired": false,
          "nameNeedQuoted": true,
        },
        "aria-label": {
          "isFromMacroDefine": false,
          "isMaybeBool": false,
          "isRequired": false,
          "nameNeedQuoted": true,
        },
        "data-test-id": {
          "isFromMacroDefine": false,
          "isMaybeBool": false,
          "isRequired": false,
          "nameNeedQuoted": true,
        },
      }
    `)
  })
})
