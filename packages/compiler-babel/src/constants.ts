export const BARE_CALL_MACROS = [
  'vineExpose',
  'vineOptions',
  'vineStyle',
  'vineStyle.scoped',
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
export const TS_NODE_KINDS = [
  'as_expression',
  'type_assertion',
  'non_null_expression',
  'satisfies_expression',
] as const
export const BOOL_KINDS = ['true', 'false'] as const
