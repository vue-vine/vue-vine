import type { ParserOptions } from '@babel/parser'
import type { Identifier, Node } from '@babel/types'
import type { VineBabelRoot } from '../src/types'
import { normalize } from 'node:path'
import { generateCodeFrame } from '@vue/shared'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { _breakableTraverse, exitTraverse } from '../src'
import { getFunctionParams, getFunctionPickedInfos, isVineCompFnDecl } from '../src/babel-helpers/ast'
import { babelParse } from '../src/babel-helpers/parse'
import { invalidateTypeCache, registerTS, TypeResolver } from '../src/type-resolver'

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
  return resolved
}

registerTS(() => ts)

describe('resolve type', () => {
  it('should resolve type alias', () => {
    const code = `
type Aliased = { foo: number }

export function MyComp(props: Aliased) {
  return vine\`<div> foo: {{ foo }} </div>\`
}
    `
    const { props } = resolve(code)
    expect(Object.keys(props)).toStrictEqual(['foo'])
  })

  it('should resolve complex type', () => {
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
  return vine\`<div> foo: {{ foo }} </div>\`
}
    `
    const { props } = resolve(code)
    expect(Object.keys(props)).toStrictEqual([
      'title',
      'variant',
      'message',
      'errorCode',
    ])
  })
})
