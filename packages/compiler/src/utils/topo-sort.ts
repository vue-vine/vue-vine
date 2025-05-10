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

    const depNodes = relationsMap[node]
    if (!depNodes) {
      // Invalid dependency, maybe an external component,
      // So we exit here to skip it
      return
    }

    for (const depNode of depNodes) {
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

  return sorted
}
