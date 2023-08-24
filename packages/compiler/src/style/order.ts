import type { ElementNode } from '@vue/compiler-dom'
import { traverseTemplate } from '../template/traverse'
import { isComponentNode, isTemplateElementNode } from '../template/type-predicate'
import type { VineFileCtx } from '../types'
import { createStyleImportStmt } from './create-import-statement'

type ComponentRelationsMap = Record<string, Set<string>>

function topoSort(
  relationsMap: Record<string, Set<string>>,
): string[] | null {
  const visited: Record<string, boolean> = {}
  const sorted: string[] = []

  function dfs(node: string, stack: Record<string, boolean>) {
    if (stack[node]) {
      // circle dependency detected
      return null
    }

    if (visited[node])
      return

    visited[node] = true
    stack[node] = true

    for (const depNode of relationsMap[node]) {
      const result = dfs(depNode, stack)
      if (result === null) {
        // sub-tree detected circle dependency, so just quit
        return null
      }
    }

    stack[node] = false
    sorted.push(node)
  }

  for (const node of Object.keys(relationsMap)) {
    dfs(node, {})
  }

  // If there're still some nodes not visited, it means there's a circle dependency.
  if (sorted.length !== Object.keys(visited).length) {
    return null
  }

  return sorted
}

/**
 * Sort the style import statements.
 *
 * Because we must keep child-component's style priority
 * higher than parent-component's style, so we must compute
 * a import map for the current file's multiple components.
 */
export function sortStyleImport(vineFileCtx: VineFileCtx) {
  const { vineCompFns, styleDefine } = vineFileCtx
  const relationsMap: ComponentRelationsMap = Object.fromEntries(
    vineCompFns.map(
      compFnCtx => [compFnCtx.fnName, new Set<string>()],
    ),
  )

  for (const compFnCtx of vineCompFns) {
    const templateAstRootNode = compFnCtx.templateAst
    if (!templateAstRootNode) {
      continue
    }
    traverseTemplate(templateAstRootNode,
      templateAstNode => (
        isTemplateElementNode(templateAstNode)
        && isComponentNode(templateAstNode)
      ),
      (templateAstNode) => {
        relationsMap[compFnCtx.fnName].add(
          (templateAstNode as ElementNode).tag,
        )
      })
  }

  const sortedStyleImportStmts = (
    topoSort(relationsMap)?.map(
      compName => vineCompFns.find(
        compFn => compFn.fnName === compName,
      )!,
    ) ?? []
  )
    .filter(
      fnCompCtx => Boolean(styleDefine[fnCompCtx.scopeId]),
    )
    .map(
      fnCompCtx => [fnCompCtx, styleDefine[fnCompCtx.scopeId]] as const,
    )
    .map(
      ([fnCompCtx, styleMeta]) => createStyleImportStmt(
        vineFileCtx,
        fnCompCtx,
        styleMeta,
      ),
    )

  return sortedStyleImportStmts
}
