import type { VineFnCompCtx } from '@vue-vine/compiler'
import { VineBindingTypes } from '@vue-vine/compiler'
import type { VueCompilerOptions } from '@vue/language-core'
import { generateGlobalTypes as vueLangCoreGenerateGlobalTypes } from '@vue/language-core/lib/codegen/script/globalTypes'

export function generateGlobalTypes(
  vueCompilerOptions: VueCompilerOptions,
) {
  let globalTypes = vueLangCoreGenerateGlobalTypes(vueCompilerOptions)

  // Replace __VLS_Element
  globalTypes = globalTypes
    .replace(
      'type __VLS_Element = import(\'vue/jsx-runtime\').JSX.Element;',
      'type __VLS_Element = { [VUE_VINE_COMPONENT]: true }',
    )

  // Insert Vine specific definition after 'declare global'
  globalTypes = globalTypes.replace(
    /declare global\s*\{/,
    `declare global {
  const VUE_VINE_COMPONENT: unique symbol;
  function __createVineVLSCtx<T>(ctx: T): import('vue').UnwrapRef<T>;
    `,
  )

  return globalTypes
}

export function generateVLSContext(
  vineCompFn: VineFnCompCtx,
): string {
  const bindingEntries = Object.entries(vineCompFn.bindings)
  const notPropsBindings = bindingEntries.filter(
    ([, bindingType]) => (
      bindingType !== VineBindingTypes.PROPS
      && bindingType !== VineBindingTypes.PROPS_ALIASED
    ),
  )

  const __VINE_CONTEXT_TYPES = `
type __CTX_TYPES_FROM_FORMAL_PARAMS = ${
  vineCompFn.getPropsTypeRecordStr('; ')
};
type __CTX_TYPES = __VINE_VLS_Expand<__VINE_VLS_Modify<
  __CTX_TYPES_FROM_BINDING,
  __CTX_TYPES_FROM_FORMAL_PARAMS
>>;
const __VLS_ctx = __createVineVLSCtx({
${notPropsBindings.map(([name]) => `  ${name},`).join('\n')}
  ...props as any as ${vineCompFn.getPropsTypeRecordStr('; ')},
});
`

  return __VINE_CONTEXT_TYPES
}
