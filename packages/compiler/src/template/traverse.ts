import type { Node, RootNode, TemplateChildNode } from '@vue/compiler-dom'

function traverseNode(
  node: TemplateChildNode,
  filter: (node: Node) => boolean,
  callback: (node: Node) => void,
) {
  const children = (node as any).children
  if (!filter(node)) {
    return
  }
  callback(node)
  if (Array.isArray((children))) {
    for (const childNode of children) {
      traverseNode(childNode, filter, callback)
    }
  }
}

export function traverseTemplate(
  templateAstRootNode: RootNode,
  filter: (node: Node) => boolean,
  callback: (node: Node) => void,
) {
  for (const childNode of templateAstRootNode.children) {
    traverseNode(childNode, filter, callback)
  }
}
