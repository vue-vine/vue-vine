import type { ElementNode, ElementTypes, Node, NodeTypes } from '@vue/compiler-dom'

export function isTemplateElementNode(node: Node): node is ElementNode {
  return node.type === 1 satisfies NodeTypes.ELEMENT /* NodeTypes.ELEMENT */
}
export function isComponentNode(node: ElementNode): boolean {
  return (
    node.type === 1 satisfies NodeTypes.ELEMENT /* NodeTypes.ELEMENT */
    && node.tagType === 1 satisfies ElementTypes.COMPONENT /* ElementTypes.COMPONENT */
  )
}
