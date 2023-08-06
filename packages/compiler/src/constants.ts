import type { BindingTypes as VueBindingTypes } from '@vue/compiler-dom'

export const DEFINE_COMPONENT_HELPER = 'defineComponent'
export const USE_DEFAULTS_HELPER = 'useDefaults'
export const TO_REFS_HELPER = 'toRefs'
export const CSS_VARS_HELPER = 'useCssVars'
export const UN_REF_HELPER = 'unref'
export const BARE_CALL_MACROS = [
  'vineExpose',
  'vineOptions',
  'vineStyle',
  'vineStyle.scoped',
  'vineCustomElement',
] as const
export const VINE_MACROS = [
  'vineProp',
  'vineProp.optional',
  'vineProp.withDefault',
  'vineEmits',
  ...BARE_CALL_MACROS,
] as const
export const VINE_TAG_TEMPLATE_CALLER = [
  'vine',
  'css',
  'scss',
  'sass',
  'less',
  'stylus',
  'postcss',
] as const
export const SUPPORTED_CSS_LANGS = ['css', 'scss', 'sass', 'less', 'stylus', 'postcss'] as const
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
export const TS_NODE_TYPES = [
  'TSAsExpression', // foo as number
  'TSTypeAssertion', // (<number>foo)
  'TSNonNullExpression', // foo!
  'TSInstantiationExpression', // foo<string>
  'TSSatisfiesExpression', // foo satisfies T
]
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
