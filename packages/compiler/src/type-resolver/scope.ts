import type { Identifier, Node } from '@babel/types'
import type { Import, ScopeTypeNode } from './types'

/**
 * Represents a type scope that maintains type information for a file
 */
export class TypeScope {
  /**
   * Whether this scope is for handling generic parameters
   */
  isGenericScope = false

  /**
   * Cache for resolved import sources
   */
  resolvedImportSources: Record<string, string> = Object.create(null)

  /**
   * Exported types in this scope
   */
  exportedTypes: Record<string, ScopeTypeNode> = Object.create(null)

  /**
   * Exported declare statements in this scope
   */
  exportedDeclares: Record<string, ScopeTypeNode> = Object.create(null)

  constructor(
    /**
     * The filename this scope belongs to
     */
    public filename: string,

    /**
     * Source content of the file
     */
    public source: string,

    /**
     * Starting offset in the source
     */
    public offset: number = 0,

    /**
     * Import declarations in this scope
     */
    public imports: Record<string, Import> = Object.create(null),

    /**
     * Type declarations in this scope
     */
    public types: Record<string, ScopeTypeNode> = Object.create(null),

    /**
     * Declare statements in this scope
     */
    public declares: Record<string, ScopeTypeNode> = Object.create(null),

    /**
     * Runtime values in this scope
     */
    public runtime: Record<string, any> = Object.create(null),
  ) {}
}

/**
 * Creates a child scope inheriting from a parent scope
 */
export function createChildScope(parentScope: TypeScope): TypeScope {
  return new TypeScope(
    parentScope.filename,
    parentScope.source,
    parentScope.offset,
    Object.create(parentScope.imports),
    Object.create(parentScope.types),
    Object.create(parentScope.declares),
  )
}

/**
 * Records import declarations in a scope
 */
export function recordImports(body: Node[]): Record<string, Import> {
  const imports: TypeScope['imports'] = Object.create(null)
  for (const s of body) {
    if (s.type === 'ImportDeclaration') {
      for (const spec of s.specifiers) {
        if (
          spec.type === 'ImportSpecifier'
          && spec.imported.type !== 'Identifier'
        ) {
          continue
        }

        imports[spec.local.name] = {
          imported: spec.type === 'ImportDefaultSpecifier'
            ? 'default'
            : spec.type === 'ImportNamespaceSpecifier'
              ? '*'
              : (spec.imported as Identifier).name,
          source: s.source.value,
        }
      }
    }
  }
  return imports
}

/**
 * Merge two namespace declarations
 */
export function mergeNamespaces(to: Node, from: Node): void {
  const toBody = (to as any).body
  const fromBody = (from as any).body

  if (toBody.type === 'TSModuleDeclaration') {
    if (fromBody.type === 'TSModuleDeclaration') {
      // both decl
      mergeNamespaces(toBody, fromBody)
    }
    else {
      // to: decl -> from: block
      fromBody.body.push({
        type: 'ExportNamedDeclaration',
        declaration: toBody,
        exportKind: 'type',
        specifiers: [],
      })
    }
  }
  else if (fromBody.type === 'TSModuleDeclaration') {
    // to: block <- from: decl
    toBody.body.push({
      type: 'ExportNamedDeclaration',
      declaration: fromBody,
      exportKind: 'type',
      specifiers: [],
    })
  }
  else {
    // both block
    toBody.body.push(...fromBody.body)
  }
}

/**
 * Attaches a namespace to a node
 */
export function attachNamespace(
  to: Node & { _ns?: Node },
  ns: Node,
): void {
  if (!to._ns) {
    to._ns = ns
  }
  else {
    mergeNamespaces(to._ns, ns)
  }
}
