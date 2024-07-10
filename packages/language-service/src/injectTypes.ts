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
  function __createVineVLSCtx<T>(ctx: T): import('vue').UnwrapRef<T> & Record<string, unknown>;
    `,
  )

  return globalTypes
}

export function generateVLSContext(
  vineCompFn: VineFnCompCtx,
) {
  const bindingEntries = Object.entries(vineCompFn.bindings)
  const setupBindings = bindingEntries.filter(
    ([, bindingType]) => (
      bindingType !== VineBindingTypes.PROPS
      && bindingType !== VineBindingTypes.PROPS_ALIASED
    ),
  )

  return `const __VLS_ctx = __createVineVLSCtx({\n${
    setupBindings
      .map(([bindingName]) => twoSpaceTab(bindingName))
      .join(', \n')
  }\n${
    // Because we generate formal parameter above,
    // gurantee that function at least has a parameter `props`.
    '  ...props,'
  }\n});\n`

  function twoSpaceTab(str: string) {
    return `  ${str}`
  }
}
