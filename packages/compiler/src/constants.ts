import type { VineStyleLang } from './types'

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
export const BOOL_KINDS = ['true', 'false']

export const STYLE_LANG_FILE_EXTENSION: Record<VineStyleLang, string> = {
  css: 'css',
  postcss: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  stylus: 'styl',
}

export const CSS_VARS_HELPER = 'useCssVars'
export const UN_REF_HELPER = 'unref'
