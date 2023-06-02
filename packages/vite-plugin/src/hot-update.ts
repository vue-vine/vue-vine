import type { HmrContext, ModuleNode } from 'vite'
import { parseQuery } from './parse-query'

export function handleHotUpdate(
  { modules }: HmrContext,
): ModuleNode[] {
  const affectedModules = new Set<ModuleNode>()
  modules.forEach((m) => {
    const importedModules = m.importedModules
    if (importedModules.size > 0) {
      [...importedModules].forEach((im) => {
        if (!im.id)
          return
        const { query } = parseQuery(im.id)
        // filter css modules
        if (query.type === 'vine-style') {
          affectedModules.add(im)
        }
      })
    }
  })

  return affectedModules.size > 0
    ? [...modules, ...affectedModules]
    : [...modules]
}
