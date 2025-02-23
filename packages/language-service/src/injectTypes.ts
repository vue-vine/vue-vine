import type { VineFnCompCtx } from '@vue-vine/compiler'
import type { VueCompilerOptions } from '@vue/language-core'
import { posix as path } from 'node:path'
import { VineBindingTypes } from '@vue-vine/compiler'
import { generateGlobalTypes as _generateGlobalTypes } from '@vue/language-core'

export function setupGlobalTypes(
  rootDir: string,
  vueOptions: VueCompilerOptions,
  host: {
    fileExists: (path: string) => boolean
    writeFile?: (path: string, data: string) => void
  },
) {
  if (!host.writeFile) {
    return ''
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
    return globalTypesPath
  }
  catch {
    return ''
  }
}

export function generateGlobalTypes(vueOptions: VueCompilerOptions) {
  let globalTypes = _generateGlobalTypes(vueOptions)

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
  type __StrictIsAny<T> = [unknown] extends [T]
    ? ([T] extends [unknown] ? true : false)
    : false;
  type __OmitAny<T> = {
    [K in keyof T as __StrictIsAny<T[K]> extends true ? never : K]: T[K]
  }
  type MakeVLSCtx<T extends object> = {
    [K in keyof T]: T[K]
  }
  const __createVineVLSCtx: <T>(ctx: T) => MakeVLSCtx<import('vue').UnwrapRef<T>>;
  type VueVineComponent = __VLS_Element;

  // From vuejs 'runtime-core.d.ts':
  type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
  type RecordToUnion<T extends Record<string, any>> = T[keyof T];
  type VueDefineEmits<T extends Record<string, any>> = UnionToIntersection<Exclude<RecordToUnion<{
      [K in keyof T]: (evt: K, ...args: Exclude<T[K], undefined>) => void;
  }>, undefined>>;

  type __VLS_VineComponentCommonProps = {
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

function maybeDestructuredPropsToStr(vineCompFn: VineFnCompCtx) {
  const { propsDestructuredNames } = vineCompFn
  if (Object.keys(propsDestructuredNames).length === 0) {
    return 'props'
  }

  const result = Object.entries(propsDestructuredNames).reduce((acc, [name, meta]) => {
    const key = meta.alias ?? name
    acc.push(`/* __LINKED_CODE_LEFT__#${key.length} */${key}: /* __LINKED_CODE_RIGHT__#${key.length} */${key}`)
    return acc
  }, [] as string[])

  return `{ ${result.join(', ')} }`
}

export function generateVLSContext(
  vineCompFn: VineFnCompCtx,
): string {
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
      ],
    ), // Deduplicate same binding keys
  )
  const notPropsBindings = bindingEntries.filter(
    ([, bindingType]) => (
      bindingType !== VineBindingTypes.PROPS
      && bindingType !== VineBindingTypes.PROPS_ALIASED
    ),
  )

  const __VINE_CONTEXT_TYPES = `
type __CTX_TYPES_FROM_FORMAL_PARAMS = ${
  vineCompFn.getPropsTypeRecordStr({
    joinStr: '; ',
  })
};
const __VLS_ctx = __createVineVLSCtx({
${notPropsBindings.map(([name]) => {
  // `name` maybe 'router-view' format,
  // so we need to convert it to PascalCase: `RouterView`
  if (name.includes('-')) {
    name = name.split('-').map(
      part => part[0].toUpperCase() + part.slice(1),
    ).join('')
  }

  return `  ${
    createLinkedCodeTag('left', name.length)
  }${name}: ${
    createLinkedCodeTag('right', name.length)
  }${name},`
}).join('\n')}
  ${
    vineCompFn.propsDefinitionBy === 'annotaion'
      ? `...${
        maybeDestructuredPropsToStr(vineCompFn)
      },`
      : '/* No props formal params */'
  }
});
const __VLS_localComponents = __VLS_ctx;
type __VLS_LocalComponents = __OmitAny<typeof __VLS_localComponents>;
const __VLS_components = {
  ...{} as __VLS_GlobalComponents,
  ...__VLS_localComponents as __VLS_LocalComponents,
};
`

  return __VINE_CONTEXT_TYPES
}
