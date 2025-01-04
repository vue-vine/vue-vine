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
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": false,
        },
        "message": {
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": false,
        },
        "title": {
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": true,
        },
        "variant": {
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": true,
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
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": true,
        },
        "bbb": {
          "isBool": false,
          "isFromMacroDefine": false,
          "isRequired": true,
        },
      }
    `)
  })
})
