import type { Expression, Identifier, Node, TSEntityName } from '@babel/types'

/**
 * Represents an unknown type in the type system
 */
export const UNKNOWN_TYPE = 'Unknown'

/**
 * Creates a function that generates canonical filenames
 */
export function createGetCanonicalFileName(useCaseSensitiveFileNames: boolean) {
  return useCaseSensitiveFileNames
    ? (x: string) => x
    : (x: string) => x.toLowerCase()
}

/**
 * Gets the identifier name from a node
 */
export function getId(node: Expression | Identifier | TSEntityName): string {
  if (node.type === 'Identifier') {
    return node.name
  }
  if (node.type === 'StringLiteral') {
    return node.value
  }
  if (node.type === 'TSQualifiedName') {
    const left = getId(node.left)
    const right = getId(node.right)
    return `${left}.${right}`
  }
  return ''
}

/**
 * Gets the imported name from an import specifier
 */
export function getImportedName(specifier: Node): string {
  if (specifier.type === 'ImportSpecifier') {
    return specifier.imported.type === 'Identifier'
      ? specifier.imported.name
      : specifier.imported.value
  }
  if (specifier.type === 'ImportDefaultSpecifier') {
    return 'default'
  }
  if (specifier.type === 'ImportNamespaceSpecifier') {
    return '*'
  }
  return ''
}

/**
 * Joins path segments
 */
export function joinPaths(...segments: string[]): string {
  return segments.join('/')
}

/**
 * Normalizes a file path
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}
