import type { ComponentNode, ElementNode, TemplateChildNode } from '@vue/compiler-dom'
import { ElementTypes, NodeTypes } from '@vue/compiler-dom'

type WalkAction = (
  node: TemplateChildNode,
  parents: TemplateChildNode[],
  breakWalk: () => void,
) => void
interface WalkActions {
  enter?: WalkAction
  leave?: WalkAction
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
  root: Walkable | undefined,
  walkActions: WalkActions,
) {
  if (!root) {
    return
  }

  const parents: TemplateChildNode[] = []
  let isBreakedWalk = false
  const breakWalk = () => {
    isBreakedWalk = true
  }

  const walk = (node: TemplateChildNode) => {
    if (!isWalkable(node) || isBreakedWalk) {
      return
    }

    parents.push(node)
    walkActions.enter?.(node, parents, breakWalk)
    node.children.forEach(child => walk(child))
    walkActions.leave?.(node, parents, breakWalk)
    parents.pop()
  }

  root.children.forEach(child => walk(child))
}

export function isElementNode(node: TemplateChildNode): node is ElementNode {
  return node.type === NodeTypes.ELEMENT
}

export function isComponentNode(node: TemplateChildNode): node is ComponentNode {
  return (
    isElementNode(node)
    && node.tagType === ElementTypes.COMPONENT
  )
}
