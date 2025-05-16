import type { ElementNode } from '@vue/compiler-dom'
import type { VineFileCtx } from '../types'
import type { ComponentRelationsMap } from '../utils/topo-sort'
import { traverseTemplate } from '../template/traverse'
import { isComponentNode, isTemplateElementNode } from '../template/type-predicate'
import { topoSort } from '../utils/topo-sort'
import { createStyleImportStmt } from './create-import-statement'

/**
 * Sort the style import statements.
 *
 * Because we must keep child-component's style priority
 * higher than parent-component's style, so we must compute
 * a import map for the current file's multiple components.
 */
export function sortStyleImport(
  vineFileCtx: VineFileCtx,
) {
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
    traverseTemplate(templateAstRootNode, templateAstNode => (
      isTemplateElementNode(templateAstNode)
      && isComponentNode(templateAstNode)
    ), (templateAstNode) => {
      relationsMap[compFnCtx.fnName].add(
        (templateAstNode as ElementNode).tag,
      )
    })
  }

  const sortedCompFns = topoSort(relationsMap)?.map(
    compName => vineCompFns.find(
      compFn => compFn.fnName === compName,
    )!,
  ) ?? []
  const hasStyleDefineCompFns = sortedCompFns.filter(
    compFn => Boolean(styleDefine[compFn.scopeId]),
  )
  const sortedStyleImportStmts = hasStyleDefineCompFns.map(
    compFn => [compFn, styleDefine[compFn.scopeId]] as const,
  ).map(
    ([compFn, styleMetas]) => styleMetas.map(
      (styleMeta, i) => createStyleImportStmt(
        vineFileCtx,
        compFn,
        styleMeta,
        i,
      ),
    ),
  ).flat()

  return sortedStyleImportStmts
}
