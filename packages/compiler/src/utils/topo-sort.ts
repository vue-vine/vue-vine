export type ComponentRelationsMap = Record<string, Set<string>>

export function topoSort(
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
