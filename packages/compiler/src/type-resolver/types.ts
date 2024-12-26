import type {
  Node,
  Statement,
  TSCallSignatureDeclaration,
  TSFunctionType,
  TSMethodSignature,
  TSModuleDeclaration,
  TSPropertySignature,
} from '@babel/types'
import type { TypeScope } from './scope'

/**
 * Core options for type resolution
 */
export interface TypeResolveOptions {
  /**
   * Optional list of global type definition files
   */
  globalTypeFiles?: string[]
  /**
   * File system interface
   */
  fs?: FileSystem
  /**
   * Babel parser plugins
   */
  babelParserPlugins?: any[]
  /**
   * Whether in production mode
   */
  isProd?: boolean
}

/**
 * The minimal context required for type resolution
 */
export interface TypeResolveContext {
  filename: string
  source: string
  options: TypeResolveOptions
  ast: Statement[]
  deps?: Set<string>
  fs?: FileSystem
  scope?: TypeScope
  currentScope?: TypeScope
  error: (msg: string, node: Node, scope: TypeScope) => any
  loadFile?: (filename: string, content: string) => Node | undefined
}

/**
 * Represents an import binding
 */
export interface Import {
  source: string
  imported: string
}

/**
 * Node with scope attachment
 */
export interface WithScope {
  _ownerScope: TypeScope
}

/**
 * Node that may have scope attachment
 */
export interface MaybeWithScope {
  _ownerScope?: TypeScope
}

/**
 * A scope-aware type node
 */
export type ScopeTypeNode = Node &
  WithScope & { _ns?: TSModuleDeclaration & WithScope }

/**
 * Resolved type elements, containing props and call signatures
 */
export interface ResolvedElements {
  props: Record<
    string,
    (TSPropertySignature | TSMethodSignature) & {
      _ownerScope: TypeScope
    }
  >
  calls?: (TSCallSignatureDeclaration | TSFunctionType)[]
}

/**
 * File system interface required for type resolution
 */
export interface FileSystem {
  fileExists: (path: string) => boolean
  readFile: (path: string) => string | undefined
  realpath?: (path: string) => string
}

/**
 * Helper type for getting type from a Set
 */
export type GetSetType<T> = T extends Set<infer V> ? V : never

/**
 * Reference types supported in type resolution
 */
export type ReferenceTypes =
  | import('@babel/types').TSTypeReference
  | import('@babel/types').TSExpressionWithTypeArguments
  | import('@babel/types').TSImportType
  | import('@babel/types').TSTypeQuery
