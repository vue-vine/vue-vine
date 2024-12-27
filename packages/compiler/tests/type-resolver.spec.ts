import type { ParserOptions } from '@babel/parser'
import type { Identifier, Node } from '@babel/types'
import type { ResolvedElements } from '../src/type-resolver'
import type { VineBabelRoot } from '../src/types'
import { normalize } from 'node:path'
import { generateCodeFrame } from '@vue/shared'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { _breakableTraverse, exitTraverse } from '../src'
import { getFunctionParams, getFunctionPickedInfos, isVineCompFnDecl } from '../src/babel-helpers/ast'
import { babelParse } from '../src/babel-helpers/parse'
import { invalidateTypeCache, registerTS, TypeResolver } from '../src/type-resolver'

function getPropsResolved(
  props: ResolvedElements['props'],
) {
  return (
    [...Object.entries(props)]
      .map(([name, { optional }]) => {
        return `${name}${optional ? '?' : ''}`
      })
  )
}

function findVineComponentFunctionPropsTypeAnnotation(
  astRoot: VineBabelRoot,
) {
  let vineCompFnDecl: Node | undefined
  _breakableTraverse(astRoot, (descendant) => {
    if (isVineCompFnDecl(descendant)) {
      vineCompFnDecl = descendant
      throw exitTraverse
    }
  })
  if (!vineCompFnDecl) {
    return
  }

  const fnDeclPickedInfos = getFunctionPickedInfos(vineCompFnDecl)
  const [fnInfo] = fnDeclPickedInfos
  const { fnItselfNode } = fnInfo
  if (!fnItselfNode) {
    return
  }
  let propsType = (getFunctionParams(fnItselfNode)[0] as Identifier).typeAnnotation
  if (!propsType || propsType.type !== 'TSTypeAnnotation') {
    return
  }

  return propsType.typeAnnotation
}

function resolve(
  code: string,
  files: Record<string, string> = {},
  parserOptions?: ParserOptions,
  sourceFileName: string = 'test.vine.ts',
  invalidateCache = true,
) {
  const astRoot = babelParse(code, parserOptions)
  const astBody = astRoot.program.body
  const resolver = new TypeResolver({
    filename: sourceFileName,
    source: code,
    ast: astBody,
    options: {
      fs: {
        fileExists(file) {
          return Boolean(files[file] ?? files[normalize(file)])
        },
        readFile(file) {
          return files[file] ?? files[normalize(file)]
        },
      },
    },
    error: (msg, node, scope) => {
      throw new Error(
        `[vue-vine] ${msg}\n\n${scope.filename}\n${
          generateCodeFrame(
            scope.source,
            node.start! + scope.offset,
            node.end! + scope.offset,
          )
        }`,
      )
    },
  })

  if (invalidateCache) {
    for (const file of Object.keys(files)) {
      invalidateTypeCache(file)
    }
  }

  const propsType = findVineComponentFunctionPropsTypeAnnotation(astRoot)
  if (!propsType) {
    throw new Error('Failed to find props type annotation')
  }

  const resolved = resolver.resolveTypeElements(propsType)

  // eslint-disable-next-line no-debugger
  debugger

  return resolved
}

registerTS(() => ts)

describe('resolve type declaration in current file', () => {
  it('should resolve type alias', () => {
    const code = `
type Aliased = { foo: number }

export function MyComp(props: Aliased) {
  return vine\`<div> foo: {{ foo }} </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual(['foo'])
  })

  it('should work with TypeScript built-in types', () => {
    const code = `
type T1 = { foo: number, bar: string }
type T2 = { zip?: boolean, zap: number }
type T3 = 'admin' | 'user' | 'guest'
interface Article {
  title: string
  content: string
  author: string
  createdAt: Date
}
interface User {
  id: string
  name: string
  email: string
  password: string
}
type UserInfo = Omit<User, 'password'>
type T4 = { vType: 'a', aa: string } | { vType: 'b', bb: number } | boolean
type T5 = Exclude<T4, boolean>

type T = Partial<T1> & Required<T2> & Record<T3, boolean> & Pick<Article, 'title' | 'content'> & UserInfo & T5

export function MyComp(props: T) {
  return vine\`<div> Test TS built-in types </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual([
      'foo?',
      'bar?',
      'zip',
      'zap',
      'admin',
      'user',
      'guest',
      'title',
      'content',
      'id',
      'name',
      'email',
      'vType',
      'aa',
      'bb',
    ])
  })

  // https://github.com/vuejs/core/blob/21f8d9d/packages/compiler-sfc/__tests__/compileScript/resolveType.spec.ts#L181
  it('should work with template string type', () => {
    const code = `
type T = 'foo' | 'bar'
type S = 'x' | 'y'

export function MyComp(props: {
  [\`_\${T}_\${S}_\`]: string
}) {
  return vine\`<div> Test templat string types </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual([
      '_foo_x_',
      '_foo_y_',
      '_bar_x_',
      '_bar_y_',
    ])
  })

  it('should resolve generics type', () => {
    const code = `
type Aliased<T> = Readonly<Partial<T>>
type Test<T, U> = Aliased<T & U & { baz: boolean }>
type Foo = { foo: string; }
type Bar = { bar: number; }

export function MyComp(props: Test<Foo, Bar>) {
  return vine\`<div> Test generics type </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual([
      'foo?',
      'bar?',
      'baz?',
    ])
  })

  it('should resolve nested generic types', () => {
    const code = `
type T1<T> = { foo: T }
type T2<T> = { bar: T }
type T3<T> = Partial<T2<T1<T>>>

export function MyComp(props: T3<string>) {
  return vine\`<div> Test nested generic types </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual(['bar?'])
  })

  it('should resolve keyof intersection type', () => {
    const code = `
type A = { name: string } & { email: string }
type B = {
  [key in keyof A]: string
}

export function MyComp(props: B) {
  return vine\`<div> Test keyof intersection type </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual(['name', 'email'])
  })

  it('should resolve union/intersection in mapped type', () => {
    const code = `
type A = { foo: string, bar: number }
type B = { zig?: boolean }

type P = {
  [K in keyof A | keyof B]?: string
}

export function MyComp(props: P) {
  return vine\`<div> Test union/intersection in mapped type </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual([
      'foo?',
      'bar?',
      'zig?',
    ])
  })

  it('should resolve interface extends', () => {
    const code = `
type A = { foo: string }
interface B extends A {
  bar: number
}

export function MyComp(props: B) {
  return vine\`<div> Test interface extends </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual(['foo', 'bar'])
  })

  // https://alexop.dev/posts/vue-typescript-variant-props-type-safe-props/
  it('should resolve complex type - case 1', () => {
    const code = `
type BaseProps = {
  title: string;
}
type SuccessProps = BaseProps & {
  variant: 'success';
  message: string;
  errorCode?: never;
}
type ErrorProps = BaseProps & {
  variant: 'error';
  errorCode: string;
  message?: never;
}
type Props = SuccessProps | ErrorProps;

export function MyComp(props: Props) {
  return vine\`<div> Test complex type 1 </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual([
      'title',
      'variant',
      'message?',
      'errorCode?',
    ])
  })

  // https://github.com/vuejs/core/blob/21f8d9d/packages/compiler-sfc/__tests__/compileScript/resolveType.spec.ts#L153
  it('should resolve complex type - case 2', () => {
    const code = `
interface CommonProps {
  size?: 'xl' | 'l' | 'm' | 's' | 'xs'
}

type ConditionalProps =
  | {
      color: 'normal' | 'primary' | 'secondary'
      appearance: 'normal' | 'outline' | 'text'
    }
  | {
      color: number
      appearance: 'outline'
      note: string
    }

export function MyComp(props: CommonProps & ConditionalProps) {
  return vine\`<div> Test complex type 2 </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual([
      'size?',
      'color',
      'appearance',
      'note',
    ])
  })

  // https://github.com/vuejs/core/blob/21f8d9d/packages/compiler-sfc/__tests__/compileScript/resolveType.spec.ts#L198
  it('should resolve complex type - case 3', () => {
    const code = `
type T = 'foo' | 'bar'
type P = { [K in T]: string | number } & {
  [K in 'optional']?: boolean
} & {
  [K in Capitalize<T>]: string
} & {
  [K in Uppercase<Extract<T, 'foo'>>]: string
} & {
  [K in \`x\${T}\`]: string
}

export function MyComp(props: P) {
  return vine\`<div> Test complex type 3 </div>\`
}
    `
    const { props } = resolve(code)
    expect(getPropsResolved(props)).toStrictEqual([
      'foo',
      'bar',
      'optional?',
      'Foo',
      'Bar',
      'FOO',
      'xfoo',
      'xbar',
    ])
  })
})

describe('resolve types among multiple files', () => {
  it('should resolve external types', () => {

  })
})
