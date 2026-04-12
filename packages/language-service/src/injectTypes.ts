import type { CodeSegment } from './shared'
import type { VineFnCompCtx } from '@vue-vine/compiler'
import { VineBindingTypes, VinePropsDefinitionBy } from '@vue-vine/compiler'

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
export function* generateVLSContext(
  vineCompFn: VineFnCompCtx,
  {
    excludeBindings = new Set(),
  }: GenerateVLSContextOptions,
): Generator<CodeSegment> {
  // Deduplicate same binding keys
  // Only include templateComponentNames that actually exist in bindings,
  // so that truly unknown components are reported as type errors.
  const bindings = vineCompFn.bindings
  const bindingEntries = Object.entries(
    Object.fromEntries(
      [
        ...[...vineCompFn.templateComponentNames]
          .filter(compName => compName in bindings)
          .map(compName => [compName, VineBindingTypes.SETUP_CONST] as const),
        ...Object.entries(bindings),
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

  yield '\nconst __VLS_ctx = __VLS_VINE.CreateVineVLSCtx({\n'
  for (const [rawName] of notPropsBindings) {
    // `name` maybe 'router-view' format,
    // so we need to convert it to PascalCase: `RouterView`
    const name = rawName.includes('-') ? toPascalCase(rawName) : rawName
    const token = Symbol(name.length.toString())
    yield '  '
    yield ['', undefined, 0, { __linkedToken: token }]
    yield `${name}: `
    yield ['', undefined, 0, { __linkedToken: token }]
    yield `${name},\n`
  }
  yield `  ${
    vineCompFn.propsDefinitionBy !== VinePropsDefinitionBy.macro
      ? mayNeedPropsAlias(vineCompFn)
      : '/* No props formal params */'
  }\n`
  yield '});\n\n'
  yield 'const __VLS_localComponents = __VLS_ctx;\n\n'
  yield 'type __VLS_LocalComponents = __VLS_VINE.OmitAny<typeof __VLS_localComponents>;\n'
  yield 'type __VLS_LocalDirectives = __VLS_VINE.OmitAny<typeof __VLS_ctx>;\n'
  yield "type __VLS_GlobalComponents = import('vue').GlobalComponents;\n\n"
  yield "let __VLS_directives!: __VLS_LocalDirectives & import('vue').GlobalDirectives;\n"
  yield "let __VLS_intrinsics!: import('vue/jsx-runtime').JSX.IntrinsicElements;\n\n"
  yield 'const __VLS_components = {\n'
  yield '  ...{} as __VLS_GlobalComponents,\n'
  yield '  ...__VLS_localComponents as unknown as __VLS_LocalComponents,\n'
  yield '};\n'
}
