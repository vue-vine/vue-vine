import type { ElementNode, Node } from '@vue/compiler-dom'

export function isTemplateElementNode(node: Node): node is ElementNode {
  return node.type === 1 /* NodeTypes.ELEMENT */
}
export function isComponentNode(node: ElementNode) {
  return (
    node.type === 1 /* NodeTypes.ELEMENT */
    && node.tagType === 1 /* ElementTypes.COMPONENT */
  )
}
