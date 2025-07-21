import type { VineFnCompCtx } from '@vue-vine/compiler'
import type { VueCompilerOptions } from '@vue/language-core'
import { posix as path } from 'node:path'
import { VineBindingTypes, VinePropsDefinitionBy } from '@vue-vine/compiler'
import { generateGlobalTypes as _generateGlobalTypes } from '@vue/language-core'

export function setupGlobalTypes(
  rootDir: string,
  vueOptions: VueCompilerOptions,
  host: {
    fileExists: (path: string) => boolean
    writeFile?: (path: string, data: string) => void
  },
): VueCompilerOptions['__setupedGlobalTypes'] {
  if (!host.writeFile) {
    return void 0
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
    const globalTypesPath = path.join(dir, 'node_modules', '.vue-global-types', `vine_${vueOptions.lib}_${vueOptions.target}_true.d.ts`)
    const globalTypesContents = `// @ts-nocheck\nexport {};\n${generateGlobalTypes(vueOptions)}`
    host.writeFile(globalTypesPath, globalTypesContents)
    return {
      absolutePath: globalTypesPath,
    }
  }
  catch {
    console.error('[Vue Vine] Failed to setup global types')
  }
}

export function generateGlobalTypes(vueOptions: VueCompilerOptions): string {
  let globalTypes = _generateGlobalTypes(vueOptions)

  // Replace __VLS_Element
  globalTypes = globalTypes
    .replace(
      'type __VLS_Element = import(\'vue/jsx-runtime\').JSX.Element;',
      'type __VLS_Element = import(\'vue/jsx-runtime\').JSX.Element & { [VUE_VINE_COMPONENT]: true };',
    )

  // Insert Vine specific definition after 'declare global'
  globalTypes = globalTypes.replace(
    /declare global\s*\{/,
    `declare global {
  const VUE_VINE_COMPONENT: unique symbol;
  type __VLS_StrictIsAny<T> = [unknown] extends [T]
    ? ([T] extends [unknown] ? true : false)
    : false;
  type __VLS_OmitAny<T> = {
    [K in keyof T as __VLS_StrictIsAny<T[K]> extends true ? never : K]: T[K]
  }
  type __VLS_MakeVLSCtx<T extends object> =
    & T
    & import('vue').ComponentPublicInstance
  const __VLS_CreateVineVLSCtx: <T>(ctx: T) => __VLS_MakeVLSCtx<import('vue').ShallowUnwrapRef<T>>;
  type __VLS_VueVineComponent = __VLS_Element;

  // From vuejs 'runtime-core.d.ts':
  type __VLS_UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
  type __VLS_RecordToUnion<T extends Record<string, any>> = T[keyof T];
  type __VLS_VueDefineEmits<T extends Record<string, any>> = __VLS_UnionToIntersection<Exclude<__VLS_RecordToUnion<{
      [K in keyof T]: (evt: K, ...args: Exclude<T[K], undefined>) => void;
  }>, undefined>>;

  type __VLS_PickComponentExpose<F extends (...args: any[]) => any> = ReturnType<F> extends __VLS_VueVineComponent & {
    exposed: infer E
  } ? (exposed: E) => void : never;

  type __VLS_VineComponentCommonProps = import('vue').HTMLAttributes & {
    key?: PropertyKey
    ref?: string | import('vue').Ref | ((ref: Element | import('vue').ComponentPublicInstance | null, refs: Record<string, any>) => void);
  }
    `,
  )

  globalTypes = globalTypes.replace(/__VLS_/g, '__VINE_VLS_')
  return globalTypes
}

export const LINKED_CODE_TAG_PREFIX = '/* __LINKED_CODE'
export const LINKED_CODE_TAG_SUFFIX = ' */'
export function createLinkedCodeTag(
  side: 'left' | 'right',
  itemLength: number,
) {
  return `/* __LINKED_CODE_${side.toUpperCase()}__#${itemLength} */`
}

function mayNeedPropsAlias(vineCompFn: VineFnCompCtx) {
  const { propsDestructuredNames } = vineCompFn
  if (Object.keys(propsDestructuredNames).length === 0) {
    return `...${vineCompFn.propsAlias},`
  }

  return `/* No need to list destructured props here */`
}

function toPascalCase(name: string) {
  return name.split('-').filter(Boolean).map(
    part => part[0].toUpperCase() + part.slice(1),
  ).join('')
}

interface GenerateVLSContextOptions {
  excludeBindings?: Set<string>
}
export function generateVLSContext(
  vineCompFn: VineFnCompCtx,
  {
    excludeBindings = new Set(),
  }: GenerateVLSContextOptions,
): string {
  // Deduplicate same binding keys
  const bindingEntries = Object.entries(
    Object.fromEntries(
      [
        // https://github.com/vue-vine/vue-vine/issues/171
        // Maybe component is auto-imported so we remain
        // that ability to resolve it.
        ...[...vineCompFn.templateComponentNames].map(
          compName => [compName, VineBindingTypes.SETUP_CONST] as const,
        ),
        ...Object.entries(vineCompFn.bindings),
      ]
        .filter(([bindingName]) => !excludeBindings.has(bindingName)),
    ),
  )
  const notPropsBindings = bindingEntries.filter(
    ([, bindingType]) => (
      bindingType !== VineBindingTypes.PROPS
      && bindingType !== VineBindingTypes.PROPS_ALIASED
    ),
  )

  const __VINE_CONTEXT_TYPES = `
const __VLS_ctx = __VLS_CreateVineVLSCtx({
${notPropsBindings.map(([name]) => {
  // `name` maybe 'router-view' format,
  // so we need to convert it to PascalCase: `RouterView`
  if (name.includes('-')) {
    name = toPascalCase(name)
  }

  return `  ${
    createLinkedCodeTag('left', name.length)
  }${name}: ${
    createLinkedCodeTag('right', name.length)
  }${name},`
}).join('\n')}
  ${
    vineCompFn.propsDefinitionBy !== VinePropsDefinitionBy.macro
      ? mayNeedPropsAlias(vineCompFn)
      : '/* No props formal params */'
  }
});
const __VLS_localComponents = __VLS_ctx;
type __VLS_LocalComponents = __VLS_OmitAny<typeof __VLS_localComponents>;
type __VLS_LocalDirectives = __VLS_OmitAny<typeof __VLS_ctx>;
let __VLS_directives!: __VLS_LocalDirectives & __VLS_GlobalDirectives;
const __VLS_components = {
  ...{} as __VLS_GlobalComponents,
  ...__VLS_localComponents as unknown as __VLS_LocalComponents,
};
`

  return __VINE_CONTEXT_TYPES
}
