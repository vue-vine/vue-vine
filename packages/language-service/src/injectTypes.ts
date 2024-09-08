import { posix as path } from 'node:path'
import type { VineFnCompCtx } from '@vue-vine/compiler'
import { VineBindingTypes } from '@vue-vine/compiler'
import type { VueCompilerOptions } from '@vue/language-core'
import { generateGlobalTypes as _generateGlobalTypes } from '@vue/language-core'

export function setupGlobalTypes(rootDir: string, vueOptions: VueCompilerOptions, host: {
  fileExists: (path: string) => boolean
  writeFile?: (path: string, data: string) => void
}) {
  if (!host.writeFile) {
    return false
  }
  try {
    let dir = rootDir
    while (!host.fileExists(path.join(dir, 'node_modules', vueOptions.lib, 'package.json'))) {
      const parentDir = path.dirname(dir)
      if (dir === parentDir) {
        throw new Error(`Failed to locate node_modules/${vueOptions.lib}/package.json.`)
      }
      dir = parentDir
    }
    const globalTypesPath = path.join(dir, 'node_modules', '.vue-global-types', `vine_${vueOptions.lib}_${vueOptions.target}_${vueOptions.strictTemplates}.d.ts`)
    const globalTypesContents = `// @ts-nocheck\nexport {};\n${generateGlobalTypes(vueOptions.lib, vueOptions.target, vueOptions.strictTemplates)}`
    host.writeFile(globalTypesPath, globalTypesContents)
    return true
  }
  catch {
    return false
  }
}

export function generateGlobalTypes(
  lib: string,
  target: number,
  strictTemplates: boolean,
) {
  let globalTypes = _generateGlobalTypes(lib, target, strictTemplates)

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

  globalTypes = globalTypes.replace(/__VLS_/g, '__VINE_VLS_')

  return globalTypes
}

export const LINKED_CODE_LEFT = '/**__LINKED_CODE_LEFT__**/'
export const LINKED_CODE_RIGHT = '/**__LINKED_CODE_RIGHT__**/'

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
${notPropsBindings.map(([name]) => `  ${LINKED_CODE_LEFT}${name}: ${LINKED_CODE_RIGHT}${name},`).join('\n')}
  ...props as any as ${vineCompFn.getPropsTypeRecordStr('; ')},
});
`

  return __VINE_CONTEXT_TYPES
}
