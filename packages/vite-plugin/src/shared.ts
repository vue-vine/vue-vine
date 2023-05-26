import type { Pos, SgNode } from '@ast-grep/napi'
import type { BindingTypes as VueBindingTypes } from '@vue/compiler-dom'
import type MagicString from 'magic-string'

// Types:
export type VineProcessorLang = 'scss' | 'sass' | 'less' | 'stylus'
export type VineStyleLang = 'css' | 'postcss' | VineProcessorLang
export type VineTemplateBindings = Record<string, VueBindingTypes>

export interface VineStyleMeta {
  lang: VineStyleLang
  source: string
  scoped: boolean
}

export interface VinePropMeta {
  isBool: boolean
  isRequired: boolean
  /** Source code node of given validator function */
  validator?: SgNode
  /** Source code node of given default value */
  default?: SgNode
}

export interface VinePluginCtx {
  fileCtxMap: Map<string, VineFileCtx>
  vineCompileErrors: string[]
  vineCompileWarnings: string[]

  currentFileCtx?: VineFileCtx
}

export interface VineUserImport {
  source: string
  isType?: boolean
  isNamespace?: boolean
  isDefault?: boolean
}

export interface VineFileCtx {
  readonly fileId: string
  readonly sgRoot: SgNode
  fileSourceCode: MagicString
  vineFnComps: VineFnCompCtx[]
  userImports: Record<string, VineUserImport>
  vueImportAliases: Record<string, string>
  /** key: `scopeId` => value: `VineStyleMeta` */
  styleDefine: Record<string, VineStyleMeta>
  /** We assume that all import statments are at top of this file,
   * record the end line of these imports
   *
   * To be noticed that the last import statement may take up multiple lines,
   * so we store the its `.end` here.
   * */
  importsLastLine?: Pos
}

export interface VineFnCompCtx {
  fnDeclNode: SgNode
  fnValueNode: SgNode
  isExport: boolean
  isAsync: boolean
  fnName: string
  bindings: VineTemplateBindings
  propsAlias: string
  props: Record<string, VinePropMeta>
  emitsAlias: string
  emits: string[]
  /** Store the `defineExpose`'s argument in source code */
  expose?: SgNode
  /** Store the `defineOptions`'s argument in source code */
  options?: SgNode
  setupStmts: SgNode[]
  hoistSetupStmts: SgNode[]
  insideSetupStmts: SgNode[]
  templateSource: string
  scopeId: string
}

// Enums:
/** This is derived from `@vue/compiler-core` */
export const VineBindingTypes = {
  /**
   * declared as a prop
   */
  PROPS: 'props' as VueBindingTypes.PROPS,
  /**
   * a local alias of a `<script setup>` destructured prop.
   * the original is stored in __propsAliases of the bindingMetadata object.
   */
  PROPS_ALIASED: 'props-aliased' as VueBindingTypes.PROPS_ALIASED,
  /**
   * a let binding (may or may not be a ref)
   */
  SETUP_LET: 'setup-let' as VueBindingTypes.SETUP_LET,
  /**
   * a const binding that can never be a ref.
   * these bindings don't need `unref()` calls when processed in inlined
   * template expressions.
   */
  SETUP_CONST: 'setup-const' as VueBindingTypes.SETUP_CONST,
  /**
   * a const binding that does not need `unref()`, but may be mutated.
   */
  SETUP_REACTIVE_CONST: 'setup-reactive-const' as VueBindingTypes.SETUP_REACTIVE_CONST,
  /**
   * a const binding that may be a ref.
   */
  SETUP_MAYBE_REF: 'setup-maybe-ref' as VueBindingTypes.SETUP_MAYBE_REF,
  /**
   * bindings that are guaranteed to be refs
   */
  SETUP_REF: 'setup-ref' as VueBindingTypes.SETUP_REF,
  /**
   * a literal constant, e.g. 'foo', 1, true
   */
  LITERAL_CONST: 'literal-const' as VueBindingTypes.LITERAL_CONST,
} as const

// Constants:
export const PLUGIN_NAME = 'vue-vine-plugin'
export const VINE_STYLE_SCOPED_CALL = 'vineStyle.scoped'
export const VINE_PROP_OPTIONAL_CALL = 'vineProp.optional'
export const VINE_PROP_WITH_DEFAULT_CALL = 'vineProp.withDefault'

export const SUPPORTED_CSS_LANGS = ['css', 'scss', 'sass', 'less', 'stylus', 'postcss']
export const VUE_REACTIVITY_APIS = [
  'ref',
  'shallowRef',
  'computed',
  'reactive',
  'readonly',
  'watchEffect',
  'watchPostEffect',
  'watchSyncEffect',
  'watch',
  'triggerRef',
  'customRef',
  'shallowReactive',
  'shallowReadonly',
  'toRaw',
  'markRaw',
  'effectScope',
  'getCurrentScope',
  'onScopeDispose',
]
export const VUE_LIFECYCLE_HOOK_APIS = [
  'onMounted',
  'onUpdated',
  'onUnmounted',
  'onBeforeMount',
  'onBeforeUpdate',
  'onBeforeUnmount',
  'onErrorCaptured',
  'onRenderTracked',
  'onRenderTriggered',
  'onActivated',
  'onDeactivated',
  'onServerPrefetch',
]
export const TS_NODE_KINDS = [
  'as_expression',
  'type_assertion',
  'non_null_expression',
  'satisfies_expression',
]
export const CALL_PUNCS = ['(', ')', ',']
export const ARRAY_PATTERN_PUNCS = ['[', ']', ',']
export const OBJECT_PATTERN_PUNCS = ['{', '}', ',', ':']
export const ENUM_DECL_PUNCS = ['{', '}', ',', '=']

export const STYLE_LANG_FILE_EXTENSION: Record<VineStyleLang, string> = {
  css: 'css',
  postcss: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  stylus: 'styl',
}
