import type { TSESTree } from '@typescript-eslint/types'
import type { ScopeManager } from 'eslint-scope'
import type { FinalProcessTemplateInfo, PrettierType } from '../types'
import type { ParseError } from './errors'
import type { HasLocation } from './locations'
import type { Token } from './tokens'

// ------------------------------------------------------------------------------
// Common
// ------------------------------------------------------------------------------

/**
 * Objects which have their parent.
 */
export interface HasParent {
  parent?: Node | null
}

/**
 * The union type for all nodes.
 */
export type Node =
  | ESLintNode
  | VNode
  | VForExpression
  | VOnExpression
  | VSlotScopeExpression
  | VFilterSequenceExpression
  | VFilter

/**
 * The union type for all template nodes.
 */
export type VTemplateNode =
  | VNode
  | VForExpression
  | VOnExpression
  | VSlotScopeExpression
  | VFilterSequenceExpression
  | VFilter

// ------------------------------------------------------------------------------
// Script
// ------------------------------------------------------------------------------

/**
 * The union type for ESLint nodes.
 */
export type ESLintNode =
  | ESLintIdentifier
  | ESLintLiteral
  | ESLintProgram
  | ESLintSwitchCase
  | ESLintCatchClause
  | ESLintVariableDeclarator
  | ESLintStatement
  | ESLintExpression
  | ESLintProperty
  | ESLintAssignmentProperty
  | ESLintSuper
  | ESLintTemplateElement
  | ESLintSpreadElement
  | ESLintPattern
  | ESLintClassBody
  | ESLintMethodDefinition
  | ESLintPropertyDefinition
  | ESLintStaticBlock
  | ESLintPrivateIdentifier
  | ESLintModuleDeclaration
  | ESLintModuleSpecifier
  | ESLintImportExpression
  | ESLintLegacyRestProperty

/**
 * The parsing result of ESLint custom parsers.
 */
export interface ESLintExtendedProgram {
  ast: ESLintProgram
  services?: Record<string, unknown>
  visitorKeys?: { [type: string]: string[] }
  scopeManager?: ScopeManager
}

export interface ESLintProgram extends HasLocation, HasParent {
  type: 'Program'
  sourceType: 'script' | 'module'
  body: (ESLintStatement | ESLintModuleDeclaration)[]
  templateBody?: VElement & HasConcreteInfo
  tokens?: Token[]
  comments?: Token[]
  errors?: ParseError[]
}

export type ESLintStatement =
  | ESLintExpressionStatement
  | ESLintDirective
  | ESLintBlockStatement
  | ESLintEmptyStatement
  | ESLintDebuggerStatement
  | ESLintWithStatement
  | ESLintReturnStatement
  | ESLintLabeledStatement
  | ESLintBreakStatement
  | ESLintContinueStatement
  | ESLintIfStatement
  | ESLintSwitchStatement
  | ESLintThrowStatement
  | ESLintTryStatement
  | ESLintWhileStatement
  | ESLintDoWhileStatement
  | ESLintForStatement
  | ESLintForInStatement
  | ESLintForOfStatement
  | ESLintDeclaration

export interface ESLintEmptyStatement extends HasLocation, HasParent {
  type: 'EmptyStatement'
}

export interface ESLintBlockStatement extends HasLocation, HasParent {
  type: 'BlockStatement'
  body: ESLintStatement[]
}

export interface ESLintExpressionStatement extends HasLocation, HasParent {
  type: 'ExpressionStatement'
  expression: ESLintExpression
}

export interface ESLintDirective extends HasLocation, HasParent {
  type: 'ExpressionStatement'
  expression: ESLintLiteral
  directive: string
}

export interface ESLintIfStatement extends HasLocation, HasParent {
  type: 'IfStatement'
  test: ESLintExpression
  consequent: ESLintStatement
  alternate: ESLintStatement | null
}

export interface ESLintSwitchStatement extends HasLocation, HasParent {
  type: 'SwitchStatement'
  discriminant: ESLintExpression
  cases: ESLintSwitchCase[]
}

export interface ESLintSwitchCase extends HasLocation, HasParent {
  type: 'SwitchCase'
  test: ESLintExpression | null
  consequent: ESLintStatement[]
}

export interface ESLintWhileStatement extends HasLocation, HasParent {
  type: 'WhileStatement'
  test: ESLintExpression
  body: ESLintStatement
}

export interface ESLintDoWhileStatement extends HasLocation, HasParent {
  type: 'DoWhileStatement'
  body: ESLintStatement
  test: ESLintExpression
}

export interface ESLintForStatement extends HasLocation, HasParent {
  type: 'ForStatement'
  init: ESLintVariableDeclaration | ESLintExpression | null
  test: ESLintExpression | null
  update: ESLintExpression | null
  body: ESLintStatement
}

export interface ESLintForInStatement extends HasLocation, HasParent {
  type: 'ForInStatement'
  left: ESLintVariableDeclaration | ESLintPattern
  right: ESLintExpression
  body: ESLintStatement
}

export interface ESLintForOfStatement extends HasLocation, HasParent {
  type: 'ForOfStatement'
  left: ESLintVariableDeclaration | ESLintPattern
  right: ESLintExpression
  body: ESLintStatement
  await: boolean
}

export interface ESLintLabeledStatement extends HasLocation, HasParent {
  type: 'LabeledStatement'
  label: ESLintIdentifier
  body: ESLintStatement
}

export interface ESLintBreakStatement extends HasLocation, HasParent {
  type: 'BreakStatement'
  label: ESLintIdentifier | null
}

export interface ESLintContinueStatement extends HasLocation, HasParent {
  type: 'ContinueStatement'
  label: ESLintIdentifier | null
}

export interface ESLintReturnStatement extends HasLocation, HasParent {
  type: 'ReturnStatement'
  argument: ESLintExpression | null
}

export interface ESLintThrowStatement extends HasLocation, HasParent {
  type: 'ThrowStatement'
  argument: ESLintExpression
}

export interface ESLintTryStatement extends HasLocation, HasParent {
  type: 'TryStatement'
  block: ESLintBlockStatement
  handler: ESLintCatchClause | null
  finalizer: ESLintBlockStatement | null
}

export interface ESLintCatchClause extends HasLocation, HasParent {
  type: 'CatchClause'
  param: ESLintPattern | null
  body: ESLintBlockStatement
}

export interface ESLintWithStatement extends HasLocation, HasParent {
  type: 'WithStatement'
  object: ESLintExpression
  body: ESLintStatement
}

export interface ESLintDebuggerStatement extends HasLocation, HasParent {
  type: 'DebuggerStatement'
}

export type ESLintDeclaration =
  | ESLintFunctionDeclaration
  | ESLintVariableDeclaration
  | ESLintClassDeclaration

export interface ESLintFunctionDeclaration extends HasLocation, HasParent {
  type: 'FunctionDeclaration'
  async: boolean
  generator: boolean
  id: ESLintIdentifier | null
  params: ESLintPattern[]
  body: ESLintBlockStatement
}

export interface ESLintVariableDeclaration extends HasLocation, HasParent {
  type: 'VariableDeclaration'
  kind: 'var' | 'let' | 'const'
  declarations: ESLintVariableDeclarator[]
}

export interface ESLintVariableDeclarator extends HasLocation, HasParent {
  type: 'VariableDeclarator'
  id: ESLintPattern
  init: ESLintExpression | null
}

export interface ESLintClassDeclaration extends HasLocation, HasParent {
  type: 'ClassDeclaration'
  id: ESLintIdentifier | null
  superClass: ESLintExpression | null
  body: ESLintClassBody
}

export interface ESLintClassBody extends HasLocation, HasParent {
  type: 'ClassBody'
  body: (
    | ESLintMethodDefinition
    | ESLintPropertyDefinition
    | ESLintStaticBlock
  )[]
}

export interface ESLintMethodDefinition extends HasLocation, HasParent {
  type: 'MethodDefinition'
  kind: 'constructor' | 'method' | 'get' | 'set'
  computed: boolean
  static: boolean
  key: ESLintExpression | ESLintPrivateIdentifier
  value: ESLintFunctionExpression
}
export interface ESLintPropertyDefinition extends HasLocation, HasParent {
  type: 'PropertyDefinition'
  computed: boolean
  static: boolean
  key: ESLintExpression | ESLintPrivateIdentifier
  value: ESLintExpression | null
}

export interface ESLintStaticBlock
  extends HasLocation,
  HasParent,
  Omit<ESLintBlockStatement, 'type'> {
  type: 'StaticBlock'
  body: ESLintStatement[]
}

export interface ESLintPrivateIdentifier extends HasLocation, HasParent {
  type: 'PrivateIdentifier'
  name: string
}

export type ESLintModuleDeclaration =
  | ESLintImportDeclaration
  | ESLintExportNamedDeclaration
  | ESLintExportDefaultDeclaration
  | ESLintExportAllDeclaration

export type ESLintModuleSpecifier =
  | ESLintImportSpecifier
  | ESLintImportDefaultSpecifier
  | ESLintImportNamespaceSpecifier
  | ESLintExportSpecifier

export interface ESLintImportDeclaration extends HasLocation, HasParent {
  type: 'ImportDeclaration'
  specifiers: (
    | ESLintImportSpecifier
    | ESLintImportDefaultSpecifier
    | ESLintImportNamespaceSpecifier
  )[]
  source: ESLintLiteral
}

export interface ESLintImportSpecifier extends HasLocation, HasParent {
  type: 'ImportSpecifier'
  imported: ESLintIdentifier | ESLintStringLiteral
  local: ESLintIdentifier
}

export interface ESLintImportDefaultSpecifier extends HasLocation, HasParent {
  type: 'ImportDefaultSpecifier'
  local: ESLintIdentifier
}

export interface ESLintImportNamespaceSpecifier extends HasLocation, HasParent {
  type: 'ImportNamespaceSpecifier'
  local: ESLintIdentifier
}

export interface ESLintImportExpression extends HasLocation, HasParent {
  type: 'ImportExpression'
  source: ESLintExpression
}

export interface ESLintExportNamedDeclaration extends HasLocation, HasParent {
  type: 'ExportNamedDeclaration'
  declaration?: ESLintDeclaration | null
  specifiers: ESLintExportSpecifier[]
  source?: ESLintLiteral | null
}

export interface ESLintExportSpecifier extends HasLocation, HasParent {
  type: 'ExportSpecifier'
  local: ESLintIdentifier | ESLintStringLiteral
  exported: ESLintIdentifier | ESLintStringLiteral
}

export interface ESLintExportDefaultDeclaration extends HasLocation, HasParent {
  type: 'ExportDefaultDeclaration'
  declaration: ESLintDeclaration | ESLintExpression
}

export interface ESLintExportAllDeclaration extends HasLocation, HasParent {
  type: 'ExportAllDeclaration'
  exported: ESLintIdentifier | ESLintStringLiteral | null
  source: ESLintLiteral
}

export type ESLintExpression =
  | ESLintThisExpression
  | ESLintArrayExpression
  | ESLintObjectExpression
  | ESLintFunctionExpression
  | ESLintArrowFunctionExpression
  | ESLintYieldExpression
  | ESLintLiteral
  | ESLintUnaryExpression
  | ESLintUpdateExpression
  | ESLintBinaryExpression
  | ESLintAssignmentExpression
  | ESLintLogicalExpression
  | ESLintMemberExpression
  | ESLintConditionalExpression
  | ESLintCallExpression
  | ESLintNewExpression
  | ESLintSequenceExpression
  | ESLintTemplateLiteral
  | ESLintTaggedTemplateExpression
  | ESLintClassExpression
  | ESLintMetaProperty
  | ESLintIdentifier
  | ESLintAwaitExpression
  | ESLintChainExpression

export interface ESLintIdentifier extends HasLocation, HasParent {
  type: 'Identifier'
  name: string
}
interface ESLintLiteralBase extends HasLocation, HasParent {
  type: 'Literal'
  value: string | boolean | null | number | RegExp | bigint
  raw: string
  regex?: {
    pattern: string
    flags: string
  }
  bigint?: string
}
export interface ESLintStringLiteral extends ESLintLiteralBase {
  value: string
  regex?: undefined
  bigint?: undefined
}
export interface ESLintBooleanLiteral extends ESLintLiteralBase {
  value: boolean
  regex?: undefined
  bigint?: undefined
}
export interface ESLintNullLiteral extends ESLintLiteralBase {
  value: null
  regex?: undefined
  bigint?: undefined
}
export interface ESLintNumberLiteral extends ESLintLiteralBase {
  value: number
  regex?: undefined
  bigint?: undefined
}
export interface ESLintRegExpLiteral extends ESLintLiteralBase {
  value: null | RegExp
  regex: {
    pattern: string
    flags: string
  }
  bigint?: undefined
}
export interface ESLintBigIntLiteral extends ESLintLiteralBase {
  value: null | bigint
  regex?: undefined
  bigint: string
}
export type ESLintLiteral =
  | ESLintStringLiteral
  | ESLintBooleanLiteral
  | ESLintNullLiteral
  | ESLintNumberLiteral
  | ESLintRegExpLiteral
  | ESLintBigIntLiteral

export interface ESLintThisExpression extends HasLocation, HasParent {
  type: 'ThisExpression'
}

export interface ESLintArrayExpression extends HasLocation, HasParent {
  type: 'ArrayExpression'
  elements: (ESLintExpression | ESLintSpreadElement)[]
}

export interface ESLintObjectExpression extends HasLocation, HasParent {
  type: 'ObjectExpression'
  properties: (
    | ESLintProperty
    | ESLintSpreadElement
    | ESLintLegacySpreadProperty
  )[]
}

export interface ESLintProperty extends HasLocation, HasParent {
  type: 'Property'
  kind: 'init' | 'get' | 'set'
  method: boolean
  shorthand: boolean
  computed: boolean
  key: ESLintExpression
  value: ESLintExpression | ESLintPattern
}

export interface ESLintFunctionExpression extends HasLocation, HasParent {
  type: 'FunctionExpression'
  async: boolean
  generator: boolean
  id: ESLintIdentifier | null
  params: ESLintPattern[]
  body: ESLintBlockStatement
}

export interface ESLintArrowFunctionExpression extends HasLocation, HasParent {
  type: 'ArrowFunctionExpression'
  async: boolean
  generator: boolean
  id: ESLintIdentifier | null
  params: ESLintPattern[]
  body: ESLintBlockStatement
}

export interface ESLintSequenceExpression extends HasLocation, HasParent {
  type: 'SequenceExpression'
  expressions: ESLintExpression[]
}

export interface ESLintUnaryExpression extends HasLocation, HasParent {
  type: 'UnaryExpression'
  operator: '-' | '+' | '!' | '~' | 'typeof' | 'void' | 'delete'
  prefix: boolean
  argument: ESLintExpression
}

export interface ESLintBinaryExpression extends HasLocation, HasParent {
  type: 'BinaryExpression'
  operator:
    | '=='
    | '!='
    | '==='
    | '!=='
    | '<'
    | '<='
    | '>'
    | '>='
    | '<<'
    | '>>'
    | '>>>'
    | '+'
    | '-'
    | '*'
    | '/'
    | '%'
    | '**'
    | '|'
    | '^'
    | '&'
    | 'in'
    | 'instanceof'
  left: ESLintExpression | ESLintPrivateIdentifier
  right: ESLintExpression
}

export interface ESLintAssignmentExpression extends HasLocation, HasParent {
  type: 'AssignmentExpression'
  operator:
    | '='
    | '+='
    | '-='
    | '*='
    | '/='
    | '%='
    | '**='
    | '<<='
    | '>>='
    | '>>>='
    | '|='
    | '^='
    | '&='
    | '||='
    | '&&='
    | '??='
  left: ESLintPattern
  right: ESLintExpression
}

export interface ESLintUpdateExpression extends HasLocation, HasParent {
  type: 'UpdateExpression'
  operator: '++' | '--'
  argument: ESLintExpression
  prefix: boolean
}

export interface ESLintLogicalExpression extends HasLocation, HasParent {
  type: 'LogicalExpression'
  operator: '||' | '&&' | '??'
  left: ESLintExpression
  right: ESLintExpression
}

export interface ESLintConditionalExpression extends HasLocation, HasParent {
  type: 'ConditionalExpression'
  test: ESLintExpression
  alternate: ESLintExpression
  consequent: ESLintExpression
}

export interface ESLintCallExpression extends HasLocation, HasParent {
  type: 'CallExpression'
  optional: boolean
  callee: ESLintExpression | ESLintSuper
  arguments: (ESLintExpression | ESLintSpreadElement)[]
}

export interface ESLintSuper extends HasLocation, HasParent {
  type: 'Super'
}

export interface ESLintNewExpression extends HasLocation, HasParent {
  type: 'NewExpression'
  callee: ESLintExpression
  arguments: (ESLintExpression | ESLintSpreadElement)[]
}

export interface ESLintMemberExpression extends HasLocation, HasParent {
  type: 'MemberExpression'
  optional: boolean
  computed: boolean
  object: ESLintExpression | ESLintSuper
  property: ESLintExpression | ESLintPrivateIdentifier
}

export interface ESLintYieldExpression extends HasLocation, HasParent {
  type: 'YieldExpression'
  delegate: boolean
  argument: ESLintExpression | null
}

export interface ESLintAwaitExpression extends HasLocation, HasParent {
  type: 'AwaitExpression'
  argument: ESLintExpression
}

export interface ESLintTemplateLiteral extends HasLocation, HasParent {
  type: 'TemplateLiteral'
  quasis: ESLintTemplateElement[]
  expressions: ESLintExpression[]
}

export interface ESLintTaggedTemplateExpression extends HasLocation, HasParent {
  type: 'TaggedTemplateExpression'
  tag: ESLintExpression
  quasi: ESLintTemplateLiteral
}

export interface ESLintTemplateElement extends HasLocation, HasParent {
  type: 'TemplateElement'
  tail: boolean
  value: {
    cooked: string | null
    raw: string
  }
}

export interface ESLintClassExpression extends HasLocation, HasParent {
  type: 'ClassExpression'
  id: ESLintIdentifier | null
  superClass: ESLintExpression | null
  body: ESLintClassBody
}

export interface ESLintMetaProperty extends HasLocation, HasParent {
  type: 'MetaProperty'
  meta: ESLintIdentifier
  property: ESLintIdentifier
}

export type ESLintPattern =
  | ESLintIdentifier
  | ESLintObjectPattern
  | ESLintArrayPattern
  | ESLintRestElement
  | ESLintAssignmentPattern
  | ESLintMemberExpression
  | ESLintLegacyRestProperty

export interface ESLintObjectPattern extends HasLocation, HasParent {
  type: 'ObjectPattern'
  properties: (
    | ESLintAssignmentProperty
    | ESLintRestElement
    | ESLintLegacyRestProperty
  )[]
}

export interface ESLintAssignmentProperty extends ESLintProperty {
  value: ESLintPattern
  kind: 'init'
  method: false
}

export interface ESLintArrayPattern extends HasLocation, HasParent {
  type: 'ArrayPattern'
  elements: ESLintPattern[]
}

export interface ESLintRestElement extends HasLocation, HasParent {
  type: 'RestElement'
  argument: ESLintPattern
}

export interface ESLintSpreadElement extends HasLocation, HasParent {
  type: 'SpreadElement'
  argument: ESLintExpression
}

export interface ESLintAssignmentPattern extends HasLocation, HasParent {
  type: 'AssignmentPattern'
  left: ESLintPattern
  right: ESLintExpression
}

export type ESLintChainElement = ESLintCallExpression | ESLintMemberExpression

export interface ESLintChainExpression extends HasLocation, HasParent {
  type: 'ChainExpression'
  expression: ESLintChainElement
}

/**
 * Legacy for babel-eslint and espree.
 */
export interface ESLintLegacyRestProperty extends HasLocation, HasParent {
  type: 'RestProperty' | 'ExperimentalRestProperty'
  argument: ESLintPattern
}

/**
 * Legacy for babel-eslint and espree.
 */
export interface ESLintLegacySpreadProperty extends HasLocation, HasParent {
  type: 'SpreadProperty' | 'ExperimentalSpreadProperty'
  argument: ESLintExpression
}

// ------------------------------------------------------------------------------
// Template
// ------------------------------------------------------------------------------

/**
 * Constants of namespaces.
 * @see https://infra.spec.whatwg.org/#namespaces
 */
export const NS = Object.freeze({
  HTML: 'http://www.w3.org/1999/xhtml' as const,
  MathML: 'http://www.w3.org/1998/Math/MathML' as const,
  SVG: 'http://www.w3.org/2000/svg' as const,
  XLink: 'http://www.w3.org/1999/xlink' as const,
  XML: 'http://www.w3.org/XML/1998/namespace' as const,
  XMLNS: 'http://www.w3.org/2000/xmlns/' as const,
})

/**
 * Type of namespaces.
 */
export type Namespace =
  | typeof NS.HTML
  | typeof NS.MathML
  | typeof NS.SVG
  | typeof NS.XLink
  | typeof NS.XML
  | typeof NS.XMLNS

/**
 * Type of variable definitions.
 */
export interface Variable {
  id: ESLintIdentifier
  kind: 'v-for' | 'scope'
  references: Reference[]
}

/**
 * Type of variable references.
 */
export interface Reference {
  id: ESLintIdentifier
  mode: 'rw' | 'r' | 'w'
  variable: Variable | null

  // For typescript-eslint
  isValueReference?: boolean
  isTypeReference?: boolean
}

/**
 * The node of `v-for` directives.
 */
export interface VForExpression extends HasLocation, HasParent {
  type: 'VForExpression'
  parent: VExpressionContainer
  left: ESLintPattern[]
  right: ESLintExpression
}

/**
 * The node of `v-on` directives.
 */
export interface VOnExpression extends HasLocation, HasParent {
  type: 'VOnExpression'
  parent: VExpressionContainer
  body: ESLintStatement[]
}

/**
 * The node of `slot-scope` directives.
 */
export interface VSlotScopeExpression extends HasLocation, HasParent {
  type: 'VSlotScopeExpression'
  parent: VExpressionContainer
  params: ESLintPattern[]
}

/**
 * The node of a filter sequence which is separated by `|`.
 */
export interface VFilterSequenceExpression extends HasLocation, HasParent {
  type: 'VFilterSequenceExpression'
  parent: VExpressionContainer
  expression: ESLintExpression
  filters: VFilter[]
}

/**
 * The node of a filter sequence which is separated by `|`.
 */
export interface VFilter extends HasLocation, HasParent {
  type: 'VFilter'
  parent: VFilterSequenceExpression
  callee: ESLintIdentifier
  arguments: (ESLintExpression | ESLintSpreadElement)[]
}

/**
 * The union type of any nodes.
 */
export type VNode =
  | VAttribute
  | VDirective
  | VDirectiveKey
  | VTemplateRoot
  | VElement
  | VEndTag
  | VExpressionContainer
  | VIdentifier
  | VLiteral
  | VStartTag
  | VText

/**
 * Text nodes.
 */
export interface VText extends HasLocation, HasParent {
  type: 'VText'
  parent: VTemplateRoot | VElement
  value: string
}

/**
 * The node of JavaScript expression in text.
 * e.g. `{{ name }}`
 */
export interface VExpressionContainer extends HasLocation, HasParent {
  type: 'VExpressionContainer'
  parent: VTemplateRoot | VElement | VDirective | VDirectiveKey
  expression:
    | ESLintExpression
    | VFilterSequenceExpression
    | VForExpression
    | VOnExpression
    | VSlotScopeExpression
    | null
  references: Reference[]
}

/**
 * Attribute name nodes.
 */
export interface VIdentifier extends HasLocation, HasParent {
  type: 'VIdentifier'
  parent: VAttribute | VDirectiveKey
  name: string
  rawName: string
}

/**
 * Attribute name nodes.
 */
export interface VDirectiveKey extends HasLocation, HasParent {
  type: 'VDirectiveKey'
  parent: VDirective
  name: VIdentifier
  argument: VExpressionContainer | VIdentifier | null
  modifiers: VIdentifier[]
}

/**
 * Attribute value nodes.
 */
export interface VLiteral extends HasLocation, HasParent {
  type: 'VLiteral'
  parent: VAttribute
  value: string
}

/**
 * Static attribute nodes.
 */
export interface VAttribute extends HasLocation, HasParent {
  type: 'VAttribute'
  parent: VStartTag
  directive: false
  key: VIdentifier
  value: VLiteral | null
}

/**
 * Directive nodes.
 */
export interface VDirective extends HasLocation, HasParent {
  type: 'VAttribute'
  parent: VStartTag
  directive: true
  key: VDirectiveKey
  value: VExpressionContainer | null
}

/**
 * Start tag nodes.
 */
export interface VStartTag extends HasLocation, HasParent {
  type: 'VStartTag'
  parent: VElement
  selfClosing: boolean
  attributes: (VAttribute | VDirective)[]
}

/**
 * End tag nodes.
 */
export interface VEndTag extends HasLocation, HasParent {
  type: 'VEndTag'
  parent: VElement
}

/**
 * The property which has concrete information.
 */
export interface HasConcreteInfo {
  tokens: Token[]
  comments: Token[]
  errors: ParseError[]
}

/**
 * Element nodes.
 */
export interface VElement extends HasLocation, HasParent {
  type: 'VElement'
  parent: VTemplateRoot | VElement
  namespace: Namespace
  name: string
  rawName: string
  startTag: VStartTag
  children: (VElement | VText | VExpressionContainer)[]
  endTag: VEndTag | null
  variables: Variable[]
}

/**
 * Root nodes.
 */
export interface VTemplateRoot extends HasLocation {
  type: 'VTemplateRoot'
  parent: TSESTree.Node
  children: (VElement | VText | VExpressionContainer)[]
  templateInfo?: PrettierType<Omit<FinalProcessTemplateInfo, 'templateMeta' | 'templateRootAST'>>
}
