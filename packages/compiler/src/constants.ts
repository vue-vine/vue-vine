import type { BindingTypes as VueBindingTypes } from '@vue/compiler-dom'

export const DEFINE_COMPONENT_HELPER = 'defineComponent'
export const DEFINE_CUSTOM_ELEMENT_HELPER = 'defineCustomElement'
export const USE_DEFAULTS_HELPER = 'useDefaults'
export const TO_REFS_HELPER = 'toRefs'
export const USE_MODEL_HELPER = 'useModel'
export const CSS_VARS_HELPER = 'useCssVars'
export const USE_SLOT_HELPER = 'useSlots'
export const UN_REF_HELPER = 'unref'
export const DEFAULT_MODEL_NAME = 'modelValue'
export const DEFAULT_MODEL_MODIFIERS_NAME = 'modelModifiers'
export const WITH_ASYNC_CONTEXT_HELPER = 'withAsyncContext'
export const CREATE_PROPS_REST_PROXY_HELPER = 'createPropsRestProxy'

/**
 * These macros can't be inside other expressions but just called directly.
 */
export const BARE_CALL_MACROS = [
  'vineExpose',
  'vineOptions',
  'vineStyle',
  'vineStyle.scoped',
  'vineStyle.import',
  'vineStyle.import.scoped',
  'vineCustomElement',
  'vineValidators',
] as const
export const DECLARATION_MACROS = [
  'vineProp',
  'vineProp.optional',
  'vineProp.withDefault',
  'vineEmits',
  'vineSlots',
  'vineModel',
] as const
export const VINE_MACROS: Array<(typeof DECLARATION_MACROS)[number] | (typeof BARE_CALL_MACROS)[number]> = [
  ...DECLARATION_MACROS,
  ...BARE_CALL_MACROS,
]
export const VINE_TAG_TEMPLATE_CALLER = [
  'vine',
  'css',
  'scss',
  'sass',
  'less',
  'stylus',
  'postcss',
] as const
export const CAN_BE_CALLED_MULTI_TIMES_MACROS: string[] = [
  'vineModel',
  'vineStyle',
]
export const SUPPORTED_CSS_LANGS = ['css', 'scss', 'sass', 'less', 'stylus', 'postcss'] as const
export const SUPPORTED_STYLE_FILE_EXTS: string[] = [
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.styl',
]
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
] as const
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
] as const
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

  /**
   * a destructured prop
   */
  DESTRUCTURED_PROP: 'destructured-prop' as const,
} as const

export const EXPECTED_ERROR = 'expected_error'
