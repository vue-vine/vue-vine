import type { ParseResult, ParserOptions } from '@babel/parser'
import type {
  ArrowFunctionExpression,
  CallExpression,
  CommentBlock,
  ExportNamedDeclaration,
  File,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Node,
  ObjectProperty,
  ReturnStatement,
  SourceLocation,
  StringLiteral,
  TaggedTemplateExpression,
  TemplateLiteral,
  TSType,
  TSTypeLiteral,
} from '@babel/types'
import type {
  CompilerOptions,
  ConstantTypes,
  RootNode,
  BindingTypes as VueBindingTypes,
  SourceLocation as VueSourceLocation,
} from '@vue/compiler-dom'
import type MagicString from 'magic-string'
import type { Project, TypeChecker } from 'ts-morph'
import type { BARE_CALL_MACROS, VINE_MACROS } from './constants'

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
export type MacrosInfoForVolar
  = | { macroType: 'vineProp', macroCall: CallExpression, macroMeta: VinePropMeta }
    | { macroType: 'vineEmits', macroCall: CallExpression }
    | { macroType: 'vineSlots', macroCall: CallExpression }
    | { macroType: 'vineExpose', macroCall: CallExpression }
    | { macroType: 'vineValidators', macroCall: CallExpression }
    | { macroType: 'useTemplateRef', macroCall: CallExpression }
    | { macroType: 'vineStyle', macroCall: CallExpression }
export type VineStyleValidArg = StringLiteral | TemplateLiteral | TaggedTemplateExpression

export type VineProcessorLang = 'scss' | 'sass' | 'less' | 'stylus'
export type VineStyleLang = 'css' | 'postcss' | VineProcessorLang
export type VineTemplateBindings = Record<string, VueBindingTypes>

export type BabelFunctionNodeTypes
  = | FunctionDeclaration
    | FunctionExpression
    | ArrowFunctionExpression
export type BabelFunctionParams = BabelFunctionNodeTypes['params']

export type HMRCompFnsName = string | null
export interface TsMorphCache {
  project: Project
  typeChecker: TypeChecker
}

export interface VineCompilerHooks {
  getCompilerCtx: () => VineCompilerCtx
  getTsMorph?: () => TsMorphCache
  onError: (err: VineDiagnostic) => void
  onWarn: (warn: VineDiagnostic) => void
  onBindFileCtx?: (fileId: string, fileCtx: VineFileCtx) => void
  onValidateEnd?: () => void
  onAnalysisEnd?: () => void
  onEnd?: () => void
}

export interface VineCompilerOptions {
  envMode?: string // 'development' | 'production'
  inlineTemplate?: boolean
  vueCompilerOptions?: CompilerOptions & {
    /** @internal */
    __enableTransformAssetsURL?: boolean
    /** @internal */
    __transformNegativeBool?: boolean | { constType: ConstantTypes }
    /** @internal */
    __shouldAddTemplateSuffix?: boolean // Add '>' when the last tag is not complete
  }
  preprocessOptions?: Record<string, any>
  postcssOptions?: any
  postcssPlugins?: any[]
  tsMorphOptions?: {
    disabled?: boolean
    tsConfigPath?: string
  }
}

export interface VineStyleMeta {
  lang: VineStyleLang
  source: string
  isExternalFilePathSource: boolean
  range: [number, number] | undefined
  scoped: boolean
  fileCtx: VineFileCtx
  compCtx: VineCompFnCtx
}

export interface VinePropMacroInfo {
  macroCall: CallExpression
  identifier: Identifier
  jsDocComments?: CommentBlock[]
}

export interface VinePropMeta {
  typeAnnotationRaw?: string
  isFromMacroDefine: boolean
  isMaybeBool: boolean
  isRequired: boolean
  /** Source code node of given validator function */
  validator?: Node
  /** Source code node of given default value */
  default?: Node
  /** Declared identifier AST Node by vineProp */
  macroDeclaredIdentifier?: Identifier
  /** Whether the prop name needs to be quoted */
  nameNeedQuoted?: boolean
  jsDocComments?: CommentBlock[]
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
  isUsedInTemplate?: (vineCompFn: VineCompFnCtx) => boolean
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

  /* Store all ExportNamedDeclaration */
  exportNamedDeclarations: ExportNamedDeclaration[]

  getAstNodeContent: (node: Node) => string
  getLinkedTSTypeLiteralNodeContent: (node: TSTypeLiteral) => string
}

export interface VineQuery {
  type: string
  scopeId: string
  scoped: boolean
  lang: string
  index: number
  vineFileId?: string
}

export interface VineExternalStyleFileCtx {
  query: VineQuery
  sourceCode: string
}

export interface VineDestructuredProp {
  node: ObjectProperty['key']
  isRest: boolean
  alias?: string
  default?: Node
}

export const VinePropsDefinitionBy = {
  typeLiteral: 1,
  typeReference: 2,
  macro: 3,
} as const
export type VinePropsDefinitionSource = typeof VinePropsDefinitionBy[keyof typeof VinePropsDefinitionBy]

export interface VineCompFnCtx {
  fileCtx: VineFileCtx
  fnDeclNode: Node
  fnItselfNode?: BabelFunctionNodeTypes
  templateSource: string
  templateReturn?: ReturnStatement
  templateStringNode?: TaggedTemplateExpression
  templateAst?: RootNode
  templateParsedAst?: RootNode
  templateComponentNames: Set<string>
  templateRefNames: Set<string>
  isExportDefault: boolean
  isAsync: boolean
  /** is web component (customElement) */
  isCustomElement: boolean
  fnName: string
  scopeId: string
  bindings: VineTemplateBindings
  macrosInfoForVolar: MacrosInfoForVolar[]
  propsAlias: string
  props: Record<string, VinePropMeta>
  propsDestructuredNames: Record<string, VineDestructuredProp>
  propsDefinitionBy: VinePropsDefinitionSource
  propsFormalParamType?: TSType
  emitsAlias: string
  emits: string[]
  emitsTypeParam?: TSTypeLiteral
  emitsDefinitionByNames?: boolean
  /** Store the `defineExpose`'s argument in source code */
  expose?: {
    macroCall: CallExpression
    paramObj: Node
  }
  /** Store the `defineOptions`'s argument in source code */
  options?: Node
  /** Store every slot's props definition */
  slots: Record<string, {
    props: TSTypeLiteral
  }>
  slotsNamesInTemplate: string[]
  /** Store `vineModel` defines */
  vineModels: Record<string, {
    varName: string
    typeParameter?: TSType
    modelModifiersName: string
    modelOptions: Node | null
  }>
  slotsAlias: string
  hoistSetupStmts: Node[]
  cssBindings: Record<string, string | null>
  externalStyleFilePaths: string[]

  getPropsTypeRecordStr: (options?: {
    joinStr?: string
    isNeedLinkedCodeTag?: boolean
    isNeedJsDoc?: boolean
  }) => string
}

export interface VineDiagnostic {
  full: string
  msg: string
  location: SourceLocation | null | undefined
  vineCompFnCtx?: VineCompFnCtx
  rawVueTemplateLocation?: VueSourceLocation | null
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

export interface VineValidatorCtx {
  vineCompilerHooks: VineCompilerHooks
  vineFileCtx: VineFileCtx
  vineCompFns: Node[]
}

export interface MacroAssertCtx extends VineValidatorCtx {
  fromVineCompFnNode: Node
}

export type VineValidator = (
  context: VineValidatorCtx,
  fromNode: Node,
) => boolean

export interface VineAnalyzeCtx {
  vineCompilerHooks: VineCompilerHooks
  vineFileCtx: VineFileCtx
  vineCompFnCtx: VineCompFnCtx
}

export type VineAnalyzeRunner = (
  analyzeCtx: VineAnalyzeCtx,
  fnItselfNode: BabelFunctionNodeTypes,
) => void
