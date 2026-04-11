import type { VineFnCompCtx } from '@vue-vine/compiler'
import { VineBindingTypes, VinePropsDefinitionBy } from '@vue-vine/compiler'

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
const __VLS_ctx = __VLS_VINE.CreateVineVLSCtx({
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

type __VLS_LocalComponents = __VLS_VINE.OmitAny<typeof __VLS_localComponents>;
type __VLS_LocalDirectives = __VLS_VINE.OmitAny<typeof __VLS_ctx>;
type __VLS_GlobalComponents = import('vue').GlobalComponents;

let __VLS_directives!: __VLS_LocalDirectives & import('vue').GlobalDirectives;
let __VLS_intrinsics!: import('vue/jsx-runtime').JSX.IntrinsicElements;

const __VLS_components = {
  ...{} as __VLS_GlobalComponents,
  ...__VLS_localComponents as unknown as __VLS_LocalComponents,
};
`

  return __VINE_CONTEXT_TYPES
}
