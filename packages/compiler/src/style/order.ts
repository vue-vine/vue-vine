import { html } from '@ast-grep/napi'
import { STYLE_LANG_FILE_EXTENSION } from '../constants'
import type { VineFileCtx, VineFnCompCtx, VineStyleMeta } from '../types'
import { showIf } from '../utils'
import { findAllTagNameSgNodes } from '../template/parse'

function createStyleImportStmt(
  vineFileCtx: VineFileCtx,
  vineFnCompCtx: VineFnCompCtx,
  styleDefine: VineStyleMeta,
) {
  return `import ${showIf(
    // handle web component styles
    Boolean(vineFnCompCtx.isVineCE),
    `__${vineFnCompCtx.fnName.toLowerCase()}_styles from`,
  )}'${
    vineFileCtx.fileId.replace(/\.vine\.ts$/, '')
  }?type=vine-style&scopeId=${
    vineFnCompCtx.scopeId
  }&comp=${vineFnCompCtx.fnName}&lang=${
    styleDefine.lang
  }${
    showIf(
      Boolean(styleDefine.scoped),
      '&scoped=true',
    )
  }&virtual.${
    STYLE_LANG_FILE_EXTENSION[styleDefine.lang]
  }';`
}

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

  for (const node in relationsMap) {
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
  const {
    vineFnComps: vineComps,
    styleDefine,
  } = vineFileCtx
  const compRelationsMap: ComponentRelationsMap = {}
  const thisFileAllComps = vineComps.map(comp => comp.fnName)

  for (const comp of vineComps) {
    const templateSource = comp.template.text().slice(1, -1)
    const templateAst = html.parse(templateSource).root()
    const relations = findAllTagNameSgNodes(templateAst)
      .filter((tagNode) => {
        const tagName = tagNode.text()
        return thisFileAllComps.includes(tagName)
      })
      .map(tagNode => tagNode.text())
    if (!compRelationsMap[comp.fnName]) {
      compRelationsMap[comp.fnName] = new Set()
    }
    relations.forEach(
      r => compRelationsMap[comp.fnName].add(r),
    )
  }

  const sortedStyleImportStmts = (
    topoSort(compRelationsMap)?.map(
      compName => vineComps.find(
        comp => comp.fnName === compName,
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
    .join('\n')

  return sortedStyleImportStmts
}
