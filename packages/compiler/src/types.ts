import type {
  CompilerOptions,
  RootNode,
  BindingTypes as VueBindingTypes,
} from '@vue/compiler-dom'
import type {
  ArrowFunctionExpression,
  File,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Node,
  ReturnStatement,
  SourceLocation,
  StringLiteral,
  TSTypeLiteral,
  TaggedTemplateExpression,
  TemplateLiteral,
} from '@babel/types'
import type { ParseResult, ParserOptions } from '@babel/parser'
import type MagicString from 'magic-string'
import type { BARE_CALL_MACROS, VINE_MACROS } from './constants'

// Types:
export type Nil = null | undefined
export type VineBabelRoot = ParseResult<File>
export type VINE_MACRO_NAMES = typeof VINE_MACROS[number]
export type BARE_CALL_MACRO_NAMES = typeof BARE_CALL_MACROS[number]
export type CountingMacros = Exclude<
  VINE_MACRO_NAMES,
  | 'vineProp'
  | 'vineStyle.scoped'
  | 'vineProp.optional'
  | 'vineProp.withDefault'
  | 'vineModel'
>
export type VineStyleValidArg = StringLiteral | TemplateLiteral | TaggedTemplateExpression

export type VineProcessorLang = 'scss' | 'sass' | 'less' | 'stylus'
export type VineStyleLang = 'css' | 'postcss' | VineProcessorLang
export type VineTemplateBindings = Record<string, VueBindingTypes>

export type BabelFunctionNodeTypes =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression
export type BabelFunctionParams = BabelFunctionNodeTypes['params']

export declare type HMRCompFnsName = string | null

export interface VineCompilerHooks {
  getCompilerCtx: () => VineCompilerCtx
  onError: (err: VineDiagnostic) => void
  onWarn: (warn: VineDiagnostic) => void
  onBindFileCtx?: (fileId: string, fileCtx: VineFileCtx) => void
  onValidateEnd?: () => void
  onAnalysisEnd?: () => void
  onEnd?: () => void
}

export interface VineCompilerOptions {
  envMode?: string // 'development' | 'production'
  vueCompilerOptions?: CompilerOptions
  inlineTemplate?: boolean
  preprocessOptions?: Record<string, any>
  postcssOptions?: any
  postcssPlugins?: any[]
}

export interface VineStyleMeta {
  lang: VineStyleLang
  source: string
  range: [number, number] | undefined
  scoped: boolean
  fileCtx: VineFileCtx
  compCtx: VineCompFnCtx
}

export interface VinePropMeta {
  typeAnnotationRaw: string
  isFromMacroDefine: boolean
  isBool: boolean
  isRequired: boolean
  /** Source code node of given validator function */
  validator?: Node
  /** Source code node of given default value */
  default?: Node
  /** Declared identifier AST Node by vineProp */
  declaredIdentifier?: Identifier
}

export interface VineCompilerCtx {
  isRunningHMR: boolean
  fileCtxMap: Map<string, VineFileCtx>
  vineCompileErrors: VineDiagnostic[]
  vineCompileWarnings: VineDiagnostic[]
  options: VineCompilerOptions
}

export interface VineUserImport {
  source: string
  isType: boolean
  isNamespace?: boolean
  isDefault?: boolean
  isUsedInTemplate?: boolean
}

export interface VineFileCtx {
  readonly fileId: string
  readonly root: ParseResult<File>
  readonly originCode: string
  readonly isCRLF: boolean
  /**
   * Hot update only executes the
   * markup of the render function
   */
  renderOnly: boolean
  /**
   * The analysis result of the hot update module,
   * including the function name and scopeId of the component that needs to be updated
   */
  hmrCompFnsName: HMRCompFnsName
  fileMagicCode: MagicString
  vineCompFns: VineCompFnCtx[]
  userImports: Record<string, VineUserImport>
  vueImportAliases: Record<string, string>
  /** key: `scopeId` => value: `VineStyleMeta` */
  styleDefine: Record<string, VineStyleMeta[]>
  /**
   * We assume that all import statments are at top of this file,
   * record the end line of these imports
   *
   * To be noticed that the last import statement may take up multiple lines,
   * so we store the its location here.
   */
  importsLastLine?: SourceLocation | null

  getAstNodeContent: (node: Node) => string
}

export interface VineCompFnCtx {
  fnDeclNode: Node
  fnItselfNode?: BabelFunctionNodeTypes
  templateSource: string
  templateReturn?: ReturnStatement
  templateStringNode?: TaggedTemplateExpression
  templateAst?: RootNode
  isExportDefault: boolean
  isAsync: boolean
  /** is web component (customElement) */
  isCustomElement: boolean
  fnName: string
  scopeId: string
  bindings: VineTemplateBindings
  propsAlias: string
  props: Record<string, VinePropMeta>
  propsDefinitionBy: 'annotaion' | 'macro'
  emitsAlias: string
  emits: string[]
  /** Store the `defineExpose`'s argument in source code */
  expose?: Node
  /** Store the `defineOptions`'s argument in source code */
  options?: Node
  /** Store every slot's props definition */
  slots: Record<string, {
    props: TSTypeLiteral
  }>
  /** Store `vineModel` defines */
  vineModels: Record<string, {
    varName: string
    modelModifiersName: string
    modelOptions: Node | null
  }>
  slotsAlias: string
  hoistSetupStmts: Node[]
  cssBindings: Record<string, string | null>

  getPropsTypeRecordStr: (options?: {
    joinStr?: string
    isNeedLinkedCodeTag?: boolean
  }) => string
}

export interface VineDiagnostic {
  full: string
  msg: string
  location: SourceLocation | null | undefined
}

export interface VineFnPickedInfo {
  fnDeclNode: Node
  fnItselfNode?: BabelFunctionNodeTypes | undefined
  fnName: string
}

export interface VineCompileCtx {
  compilerHooks: VineCompilerHooks
  fileCtxCache?: VineFileCtx
  babelParseOptions?: ParserOptions
}
