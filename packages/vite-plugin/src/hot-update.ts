import type { HmrContext, ModuleNode } from 'vite'
import { parseQuery } from './parse-query'

export function handleHotUpdate(
  { modules }: HmrContext,
): ModuleNode[] {
  const affectedModules = new Set<ModuleNode | undefined>()
  modules.forEach((m) => {
    const importedModules = m.importedModules
    if (importedModules.size > 0) {
      [...importedModules].forEach((im) => {
        const { query } = parseQuery(im.id as string)
        // filter css modules
        if (query.type === 'vine-style') {
          affectedModules.add(im)
        }
      })
    }
  })

  if (affectedModules && affectedModules.size > 0) {
    return [...modules, ...[...affectedModules].filter(Boolean) as ModuleNode[]]
  }
  else {
    return [...modules]
  }
}
