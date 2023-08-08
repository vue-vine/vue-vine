import type { HmrContext, ModuleNode } from 'vite'
import { parseQuery } from './parse-query'
import { QUERY_TYPE_STYLE } from './constants'

export function handleHotUpdate(
  ctx: HmrContext,
): ModuleNode[] {
  const affectedModules = new Set<ModuleNode>()
  ctx.modules.forEach((m) => {
    const importedModules = m.importedModules
    if (importedModules.size > 0) {
      [...importedModules].forEach((im) => {
        if (!im.id)
          return
        const { query } = parseQuery(im.id)
        // filter css modules
        if (query.type === QUERY_TYPE_STYLE) {
          affectedModules.add(im)
        }
      })
    }
  })

  console.log(affectedModules)
  debugger
  return affectedModules.size > 0
    ? [...affectedModules]
    : [...ctx.modules]
}
