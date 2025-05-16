import type { AwaitExpression, Node } from '@babel/types'
import type { MergedImportsMap, NamedImportSpecifierMeta } from '../template/compose'
import {
  isAwaitExpression,
  isBlockStatement,
  isExpressionStatement,
  isVariableDeclaration,
  traverse,
} from '@babel/types'
import { EXPECTED_ERROR } from '../constants'

export function mayContainAwaitExpr(vineFnBodyStmt: Node) {
  let awaitExpr: AwaitExpression | undefined
  const isExprStmt = isExpressionStatement(vineFnBodyStmt)
  const isVarDeclStmt = isVariableDeclaration(vineFnBodyStmt)

  if (!(
    isVarDeclStmt
    || isExprStmt
  )) {
    return null
  }

  const isNeedResult = (
    isVarDeclStmt
    || vineFnBodyStmt.expression.type === 'AssignmentExpression'
  )

  try {
    traverse(vineFnBodyStmt, (descendant) => {
      if (isBlockStatement(descendant)) {
        throw new Error(EXPECTED_ERROR)
      }
      else if (isAwaitExpression(descendant)) {
        awaitExpr = descendant
        throw new Error(EXPECTED_ERROR)
      }
    })
  }
  catch (error: any) {
    if (error.message === EXPECTED_ERROR) {
      return {
        isNeedResult,
        awaitExpr,
      }
    }
    throw error
  }

  return null
}

export function wrapWithAsyncContext(
  isNeedResult: boolean,
  exprSourceCode: string,
) {
  return isNeedResult
    ? `(
    ([__temp,__restore] = _withAsyncContext(() => ${exprSourceCode})),
    __temp = await __temp,
    __restore(),
    __temp
    )`
    : `;(
    ([__temp,__restore] = _withAsyncContext(() => ${exprSourceCode})),
    await __temp,
    __restore()
  );`
}

export function registerImport(
  mergedImportsMap: MergedImportsMap,
  importSource: string,
  specifier: string,
  alias: string,
) {
  const vueVineImports = mergedImportsMap.get(importSource)
  if (!vueVineImports) {
    mergedImportsMap.set(importSource, {
      type: 'namedSpecifier',
      specs: new Map([[specifier, alias]]),
    })
  }
  else {
    const vueImportsSpecs = (vueVineImports as NamedImportSpecifierMeta).specs
    vueImportsSpecs.set(specifier, alias)
  }
}
