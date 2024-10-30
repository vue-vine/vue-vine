import type { TemplateChildNode } from '@vue/compiler-dom'

interface WalkActions {
  enter?: (node: TemplateChildNode, parents: TemplateChildNode[]) => void
  leave?: (node: TemplateChildNode, parents: TemplateChildNode[]) => void
}
interface Walkable {
  type: number
  children: TemplateChildNode[]
}

function isWalkable(item: any): item is Walkable {
  return (
    item
    && typeof item === 'object'
    && 'type' in item
    && 'children' in item
    && Array.isArray(item.children)
  )
}

export function walkVueTemplateAst(
  root: Walkable,
  walkActions: WalkActions,
) {
  const parents: TemplateChildNode[] = []
  const walk = (node: TemplateChildNode) => {
    if (!isWalkable(node)) {
      return
    }

    parents.push(node)
    walkActions.enter?.(node, parents)
    node.children.forEach(child => walk(child))
    walkActions.leave?.(node, parents)
    parents.pop()
  }

  root.children.forEach(child => walk(child))
}
