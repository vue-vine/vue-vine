import type { VineFileCtx } from '@vue-vine/compiler'
import { topoSort } from '@vue-vine/compiler'

interface ComponentDependencyGraph {
  nodes: Set<string>
  edges: Map<string, Set<string>>
  reverseDeps: Map<string, Set<string>>
}

export class ComponentDependencyAnalyzer {
  private cache = new Map<string, ComponentDependencyGraph>()

  analyzeDependencies(fileCtx: VineFileCtx): ComponentDependencyGraph {
    const fileId = fileCtx.fileId

    if (this.cache.has(fileId)) {
      return this.cache.get(fileId)!
    }

    const graph = this.buildDependencyGraph(fileCtx)
    this.cache.set(fileId, graph)
    return graph
  }

  getAffectedComponents(
    graph: ComponentDependencyGraph,
    changedComponent: string,
  ): Set<string> {
    const affected = new Set<string>()
    this.dfsTraverse(graph, changedComponent, affected)
    return affected
  }

  getTopologicalOrder(fileCtx: VineFileCtx): string[] | null {
    const relationsMap: Record<string, Set<string>> = {}

    for (const component of fileCtx.vineCompFns) {
      relationsMap[component.fnName] = new Set<string>()
    }

    return topoSort(relationsMap)
  }

  invalidateCache(fileId: string): void {
    this.cache.delete(fileId)
  }

  private buildDependencyGraph(fileCtx: VineFileCtx): ComponentDependencyGraph {
    const graph: ComponentDependencyGraph = {
      nodes: new Set(),
      edges: new Map(),
      reverseDeps: new Map(),
    }

    for (const component of fileCtx.vineCompFns) {
      const fnName = component.fnName
      graph.nodes.add(fnName)

      if (!graph.edges.has(fnName)) {
        graph.edges.set(fnName, new Set())
      }
      if (!graph.reverseDeps.has(fnName)) {
        graph.reverseDeps.set(fnName, new Set())
      }
    }

    return graph
  }

  private dfsTraverse(
    graph: ComponentDependencyGraph,
    node: string,
    visited: Set<string>,
  ): void {
    if (visited.has(node))
      return

    visited.add(node)
    const dependents = graph.reverseDeps.get(node) || new Set()

    for (const dependent of dependents) {
      this.dfsTraverse(graph, dependent, visited)
    }
  }
}
