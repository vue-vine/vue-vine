import type { CallExpression, Identifier, VariableDeclaration } from '@babel/types'
import type { VineFileCtx, VinePropMeta } from '@vue-vine/compiler'
import type { CodeInformation, VirtualCode } from '@vue/language-core'
import type { Segment } from 'muggle-string'
import type { BabelFunctionNodeTypes, BabelToken, VineCodeInformation, VineCompFn } from './shared'
import {
  isExportNamedDeclaration,
  isFunctionDeclaration,
  isIdentifier,
  isStringLiteral,
  isTSTypeLiteral,
  isVariableDeclaration,
} from '@babel/types'
import { _breakableTraverse, exitTraverse, VinePropsDefinitionBy } from '@vue-vine/compiler'
import { createLinkedCodeTag } from './injectTypes'
import { parseCssClassNames, turnBackToCRLF, wrapWith } from './shared'

/**
 * Convert emit event name to Vue component props name (on-prefixed camelCase)
 * @param emit Original emit event name
 * @returns Converted props name
 *
 * @example
 * convertEmitToOnHandler('update:modelValue') // 'onUpdate:modelValue'
 * convertEmitToOnHandler('my-event') // 'onMyEvent'
 * convertEmitToOnHandler('custom_event') // 'onCustom_event'
 */
export function convertEmitToOnHandler(emit: string): string {
  // Check if the emit name contains special characters that need to be quoted (colon, underscore, dot, etc., but not including hyphens)
  const hasSpecialChars = /[:_.]/.test(emit) && !/^[a-z0-9\-]+$/i.test(emit)

  if (hasSpecialChars) {
    // For complex property names, keep the original format, add only the on prefix and capitalize the first letter
    const firstChar = emit.charAt(0).toUpperCase()
    return `on${firstChar}${emit.slice(1)}`
  }
  else {
    // For simple property names (including those with hyphens), perform camel case conversion
    const camelCaseEmit = emit.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    return `on${camelCaseEmit.charAt(0).toUpperCase()}${camelCaseEmit.slice(1)}`
  }
}

/**
 * Check if a property name needs to be quoted in object literal
 * @param propName Property name to check
 * @returns true if the property name needs quotes
 */
export function needsQuotes(propName: string): boolean {
  // Check if property name is a valid JavaScript identifier
  // If it contains special characters or starts with a number, it needs quotes
  return !/^[a-z_$][\w$]*$/i.test(propName)
}

const FULL_FEATURES = {
  completion: true,
  format: true,
  navigation: true,
  semantic: true,
  structure: true,
  verification: true,
} satisfies CodeInformation
const EMPTY_OBJECT_TYPE_REGEXP = /\{\s*\}/

function getIndexOfFnDeclLeftParen(
  node: BabelFunctionNodeTypes,
  tokens: BabelToken[] = [],
): number {
  switch (node.type) {
    case 'FunctionDeclaration':
      return (
        tokens.find(
          token => (
            token.type.label === '('
            && token.start >= node.id!.end!
          ),
        )?.start ?? Number.NaN
      )
    case 'FunctionExpression':
      return (
        tokens.find(
          token => (
            token.type.label === '('
            && token.start >= node.start! + (
              node.async
                ? 5 // 'async'.length
                : 0
                  + (
                    node.generator
                      ? 9 // 'function*'.length
                      : 8 // 'function'.length
                  )
                  + (node.id?.name?.length ?? 0)
            )
          ),
        )?.start ?? Number.NaN
      )
    default:
      // ArrowFunctionExpression
      return node.start!
  }
}

interface CodegenCtx {
  currentOffset: { value: number }
  tsCodeSegments: Segment<VineCodeInformation>[]
  vineFileCtx: VineFileCtx
  snapshotContent: string
}

export function generateScriptUntil(ctx: CodegenCtx, targetOffset: number): void {
  const { currentOffset, snapshotContent, tsCodeSegments } = ctx
  tsCodeSegments.push([
    snapshotContent.slice(currentOffset.value, targetOffset),
    undefined,
    currentOffset.value,
    FULL_FEATURES,
  ])
  currentOffset.value = targetOffset
}

export function generateContextSlots(
  ctx: CodegenCtx,
  vineCompFn: VineCompFn,
  tabNum = 2,
): string {
  const { vineFileCtx } = ctx
  const slotsParam = `slots: {${vineCompFn.slotsNamesInTemplate.map((slot) => {
    const slotPropTypeLiteralNode = vineCompFn.slots[slot]?.props
    return `\n${' '.repeat(tabNum + 2)}${
      // '/* left linkCodeTag here ... */'
      slot === 'default'
        ? ''
        : createLinkedCodeTag('left', slot.length)
    }${slot}: ${slotPropTypeLiteralNode
      ? `(props: ${vineFileCtx.getAstNodeContent(slotPropTypeLiteralNode)}) => any`
      : 'unknown'
    }`
  }).join(', ')}\n${' '.repeat(tabNum)}},`

  return slotsParam
}

export function generateEmitProps(
  vineCompFn: VineCompFn,
  tabNum = 2,
): string {
  const emitParam = `{${vineCompFn.emits.map((emit) => {
    const onEmit = convertEmitToOnHandler(emit)

    // Check if the property name needs quotes in object literal
    const quotedPropName = needsQuotes(onEmit) ? `'${onEmit}'` : onEmit

    return `\n${' '.repeat(tabNum + 2)}${
      // '/* left linkCodeTag here ... */'
      vineCompFn.emitsTypeParam
        ? createLinkedCodeTag('left', onEmit.length)
        : ''
    }${quotedPropName}?: __VLS_VINE_${vineCompFn.fnName}_emits__['${emit}']`
  }).filter(Boolean).join(', ')
  }\n}`

  return emitParam
}

export function generateModelProps(
  ctx: CodegenCtx,
  vineCompFn: VineCompFn,
  tabNum = 2,
): string {
  const { vineFileCtx } = ctx
  const indent = ' '.repeat(tabNum + 2)
  const modelProps = `{${Object.entries(vineCompFn.vineModels).map(([modelName, model]) => {
    const { typeParameter, modifiersTypeParameter, modelModifiersName } = model
    const modelType = typeParameter ? vineFileCtx.getAstNodeContent(typeParameter) : 'unknown'
    // Use specific modifier type if provided, otherwise fallback to generic string
    const modifiersKeyType = modifiersTypeParameter
      ? vineFileCtx.getAstNodeContent(modifiersTypeParameter)
      : 'string'
    // Generate both model value prop and modifiers prop
    return `\n${indent}${modelName}?: ${modelType},\n${indent}${modelModifiersName}?: Partial<Record<${modifiersKeyType}, true | undefined>>`
  }).join(', ')
  }\n}`
  return modelProps
}

export function generatePrefixVirtualCode(
  ctx: CodegenCtx,
  vineCompFn: VineCompFn,
): void {
  const { tsCodeSegments } = ctx
  // __VLS_VINE_ComponentProps__
  tsCodeSegments.push(`\ntype ${vineCompFn.fnName}_Props = Parameters<typeof ${vineCompFn.fnName}>[0];\n\n`)
}

export function generateVineExpose(
  ctx: CodegenCtx,
  vineCompFn: VineCompFn,
): void {
  const { currentOffset, tsCodeSegments, vineFileCtx } = ctx
  if (!vineCompFn.expose) {
    return
  }

  const { macroCall, paramObj } = vineCompFn.expose
  generateScriptUntil(ctx, macroCall.start!)
  // __VLS_VINE_ComponentExpose__
  tsCodeSegments.push('const __VLS_VINE_ComponentExpose__ = ')
  tsCodeSegments.push(
    vineCompFn.expose
      ? [
          vineFileCtx.getAstNodeContent(vineCompFn.expose.paramObj),
          undefined,
          vineCompFn.expose.paramObj.start!,
          FULL_FEATURES,
        ]
      : '{}',
  )
  tsCodeSegments.push(';\n')

  generateScriptUntil(ctx, paramObj.start!)
  tsCodeSegments.push('__VLS_VINE_ComponentExpose__')
  currentOffset.value = paramObj.end!
  generateScriptUntil(ctx, macroCall.end!)
}

export function generateContextFormalParam(
  ctx: CodegenCtx,
  vineCompFn: VineCompFn,
  {
    tabNum = 2,
    lineWrapAtStart = true,
  }: {
    tabNum?: number
    lineWrapAtStart?: boolean
  } = {},
): string {
  // Generate `context: { ... }` after `props: ...`
  const contextProperties: string[] = []

  vineCompFn.macrosInfoForVolar
    .forEach(
      ({ macroType }) => {
        if (macroType === 'vineSlots') {
          const slotField = generateContextSlots(ctx, vineCompFn, tabNum)
          if (!slotField)
            return
          contextProperties.push(slotField)
        }
      },
    )

  // Generate `expose: (exposed: ExposedType) => void`
  if (vineCompFn.expose) {
    contextProperties.push(
      `expose: __VLS_VINE.PickComponentExpose<typeof ${vineCompFn.fnName}>,`,
    )
  }

  const contextFieldsStr = (
    contextProperties.length > 0
      ? `\n${' '.repeat(tabNum)}${contextProperties.join(`\n${' '.repeat(tabNum)}`)}${lineWrapAtStart ? `\n  \n` : '\n'}`
      : ''
  )
  const contextFormalParam = `${lineWrapAtStart ? `\n` : ''}context: {${contextFieldsStr}}`
  return contextFormalParam
}

export function generatePropsType(
  ctx: CodegenCtx,
  type: 'param' | 'macro',
  vineCompFn: VineCompFn,
): string {
  const { tsCodeSegments } = ctx
  let propTypeBase = ''
  if (type === 'macro') {
    propTypeBase = `__VLS_VINE.VineComponentCommonProps & __VLS_VINE_${vineCompFn.fnName}_props__`
  }
  else {
    // User provide a `props` formal parameter in the component function,
    // we should keep it in virtual code, and generate `context: ...` after it,
    const formalParamTypeNode = vineCompFn.propsFormalParamType
    if (formalParamTypeNode) {
      generateScriptUntil(ctx, formalParamTypeNode.start!)
      // Insert common props before the user provided props type
      tsCodeSegments.push(`__VLS_VINE.VineComponentCommonProps & `)
      generateScriptUntil(ctx, formalParamTypeNode.end!)
    }
  }

  const generatedEmitProps = generateEmitProps(vineCompFn)
  const generatedModelProps = generateModelProps(ctx, vineCompFn)
  const emitProps = EMPTY_OBJECT_TYPE_REGEXP.test(generatedEmitProps) ? '' : ` & ${generatedEmitProps}`
  const modelProps = EMPTY_OBJECT_TYPE_REGEXP.test(generatedModelProps) ? '' : ` & ${generatedModelProps}`
  return `${[
    propTypeBase,
    emitProps,
    modelProps,
  ].filter(Boolean).join(' ')},`
}

export function generateComponentPropsAndContext(
  ctx: CodegenCtx,
  vineCompFn: VineCompFn,
): void {
  const { currentOffset, tsCodeSegments, vineFileCtx } = ctx
  if (vineCompFn.propsDefinitionBy === VinePropsDefinitionBy.macro) {
    tsCodeSegments.push(`\ntype __VLS_VINE_${vineCompFn.fnName}_props__ = ${vineCompFn.getPropsTypeRecordStr({
      isNeedLinkedCodeTag: true,
      joinStr: ',\n',
      isNeedJsDoc: true,
    })}\n`)
  }
  if (vineCompFn.emits.length > 0) {
    tsCodeSegments.push(`\ntype __VLS_VINE_${vineCompFn.fnName}_emits__ = __VLS_NormalizeEmits<__VLS_VINE.VueDefineEmits<${
      vineCompFn.emitsTypeParam
        ? vineFileCtx.getAstNodeContent(vineCompFn.emitsTypeParam)
        : `{${vineCompFn.emits.map(emit => `'${emit}'?: any`).join(', ')}}`
    }>>;\n`)
  }

  // For custom element, we need to convert to the function declaration
  // to `const FnName = function () { ... } as CustomElementConstructor`
  if (vineCompFn.isCustomElement) {
    let declNode: any = vineCompFn.fnDeclNode
    if (isExportNamedDeclaration(declNode)) {
      declNode = declNode.declaration
    }
    if (
      isFunctionDeclaration(declNode)
      && declNode.id
      && declNode.body
    ) {
      // Remove the identifier, make this function declaration to a function expression,
      // then append `as CustomElementConstructor` in the end of expression
      generateScriptUntil(ctx, declNode.start!)
      tsCodeSegments.push(`const ${vineCompFn.fnName} = (function `)
      // Move cursor to the end of identifier,
      // to remain its original parameters
      currentOffset.value = declNode.id.end!
    }
    else if (
      isVariableDeclaration(declNode)
      && declNode.declarations
    ) {
      const decl = declNode.declarations[0]
      if (decl.init) {
        // since here is already a variable declaration,
        // we just need to append `as CustomElementConstructor` in the end of expression
        generateScriptUntil(ctx, decl.init.start!)
        tsCodeSegments.push('(')
      }
    }
  }

  // Gurantee the component function has a `props` formal parameter in virtual code,
  // This is for props intellisense on editing template tag attrs.
  generateScriptUntil(
    ctx,
    getIndexOfFnDeclLeftParen(
      vineCompFn.fnItselfNode!,
      vineFileCtx.root.tokens ?? [],
    ) + 1, // means generate after '(',
  )
  if (vineCompFn.propsDefinitionBy === VinePropsDefinitionBy.macro) {
    // Define props by `vineProp`, no `props` formal parameter,
    // generate a `props` formal parameter in virtual code
    tsCodeSegments.push('\n  props: ')
    tsCodeSegments.push(generatePropsType(ctx, 'macro', vineCompFn))

    // Generate `context: { ... }` after `props: ...`
    tsCodeSegments.push(
      generateContextFormalParam(ctx, vineCompFn),
    )
  }
  else {
    tsCodeSegments.push(generatePropsType(ctx, 'param', vineCompFn))

    // Generate `context: { ... }` after `props: ...`
    tsCodeSegments.push(`${generateContextFormalParam(ctx, vineCompFn, {
      tabNum: 2,
      lineWrapAtStart: false,
    })}`)
  }
}

export function generateVirtualCodeByAstPositionSorted(
  ctx: CodegenCtx,
  vineCompFn: VineCompFn,
  context: {
    excludeBindings: Set<string>
  },
): void {
  const { currentOffset, tsCodeSegments } = ctx
  const { excludeBindings } = context
  vineCompFn.macrosInfoForVolar
    // Sort by AST node start position
    .sort(
      (
        { macroCall: a },
        { macroCall: b },
      ) => {
        return a.start! - b.start!
      },
    )
    .forEach(
      (macroInfo) => {
        switch (macroInfo.macroType) {
          case 'vineProp':
            generateLinkedCodeTagRightForVineProp(
              ctx,
              vineCompFn,
              macroInfo.macroMeta,
            )
            break
          case 'vineSlots':
            generateLinkedCodeTagRightForVineSlots(
              ctx,
              macroInfo.macroCall,
            )
            break
          case 'vineEmits':
            generateLinkedCodeTagRightForVineEmits(
              ctx,
              macroInfo.macroCall,
            )
            break
          case 'vineExpose':
            generateVineExpose(ctx, vineCompFn)
            break
          case 'useTemplateRef':
            generateUseTemplateRefTypeParams(
              ctx,
              macroInfo.macroCall,
              excludeBindings,
            )
            break
          case 'vineValidators': {
            const vineValidatorsMacroCall = macroInfo.macroCall
            generateScriptUntil(
              ctx,
              vineValidatorsMacroCall.start! + 'vineValidators'.length,
            )
            tsCodeSegments.push(`<${vineCompFn.fnName}_Props>`)
            generateScriptUntil(ctx, vineValidatorsMacroCall.end!)
            break
          }
          case 'vineStyle': {
            // Skip generate `vineStyle` macro call
            const vineStyleMacroCall = macroInfo.macroCall
            const arg = vineStyleMacroCall.arguments[0]
            generateScriptUntil(ctx, arg.start!)
            // Skip the argument
            tsCodeSegments.push('"..."')
            currentOffset.value = arg.end!
            break
          }
        }
      },
    )
}

export function generateStyleScopedClasses(
  ctx: CodegenCtx,
): void {
  const { tsCodeSegments, vineFileCtx } = ctx
  tsCodeSegments.push('\ntype __VLS_VINE_StyleScopedClasses = {}')
  for (const styleDefines of Object.values(vineFileCtx.styleDefine)) {
    for (const { source: styleSource, range, scoped } of styleDefines) {
      if (!range || !scoped) {
        continue
      }

      const [rangeStart] = range
      const classNames = parseCssClassNames(styleSource)
      for (const { offset, text: classNameWithDot } of classNames) {
        const realOffset = rangeStart + offset
        tsCodeSegments.push('\n & { ')
        tsCodeSegments.push(
          ...wrapWith(
            realOffset,
            realOffset + classNameWithDot.length,
            { navigation: true },
            [
              '"',
              [
                classNameWithDot.slice(1),
                undefined,
                realOffset + 1, // after '.'
                { __combineOffset: 1 },
              ],
              '"',
            ],
          ),
        )

        tsCodeSegments.push(': true }')
      }
    }
  }
  tsCodeSegments.push(';\n')
}

export function generateLinkedCodeTagRightForVineProp(
  ctx: CodegenCtx,
  vineCompFn: VineCompFn,
  vinePropMeta: VinePropMeta,
): void {
  const { tsCodeSegments } = ctx
  // We should generate linked code tag as block comment
  // before the variable declared by `vineProp`
  if (vineCompFn.propsDefinitionBy !== VinePropsDefinitionBy.macro) {
    return
  }
  const propsVarIdAstNode = vinePropMeta.macroDeclaredIdentifier
  if (!propsVarIdAstNode) {
    return
  }
  generateScriptUntil(ctx, propsVarIdAstNode.start!)
  tsCodeSegments.push(createLinkedCodeTag('right', propsVarIdAstNode.name.length))
}

export function generateLinkedCodeTagRightForVineSlots(
  ctx: CodegenCtx,
  macroCall: CallExpression,
): void {
  const { tsCodeSegments } = ctx
  const vineSlotsType = macroCall.typeParameters?.params?.[0]
  if (!vineSlotsType || !isTSTypeLiteral(vineSlotsType)) {
    return
  }

  // Iterate every property in `vineSlots` type literal
  vineSlotsType.members.forEach((member) => {
    if (
      !member
      || (
        member.type !== 'TSMethodSignature'
        && member.type !== 'TSPropertySignature'
      )
      || !member.key
      || !isIdentifier(member.key)
    ) {
      return
    }

    // Generate linked code tag as block comment
    // before the variable declared by `vineSlots`
    generateScriptUntil(ctx, member.key.start!)
    tsCodeSegments.push(createLinkedCodeTag('right', member.key.name.length))
  })
}

export function generateLinkedCodeTagRightForVineEmits(
  ctx: CodegenCtx,
  macroCall: CallExpression,
): void {
  const { tsCodeSegments } = ctx
  const vineEmitsType = macroCall.typeParameters?.params?.[0]
  if (!vineEmitsType || !isTSTypeLiteral(vineEmitsType)) {
    return
  }

  vineEmitsType.members.forEach((member) => {
    if (
      !member
      || member.type !== 'TSPropertySignature'
      || !member.key
      || !isIdentifier(member.key)
    ) {
      return
    }

    generateScriptUntil(ctx, member.key.start!)
    tsCodeSegments.push(createLinkedCodeTag('right', member.key.name.length))
  })
}

export function generateUseTemplateRefTypeParams(
  ctx: CodegenCtx,
  call: CallExpression,
  excludeBindings: Set<string>,
): void {
  const { vineFileCtx, tsCodeSegments, currentOffset } = ctx
  const templateRefName = call.arguments[0]
  if (!isStringLiteral(templateRefName)) {
    return
  }
  const refName = templateRefName.value

  let genCursor = call.callee.end!
  generateScriptUntil(ctx, genCursor)

  // Always generate __VLS_TemplateRefs to maintain virtual code mapping for navigation
  tsCodeSegments.push(`<__VLS_TemplateRefs[`)
  tsCodeSegments.push([
    `'${refName}'`,
    undefined,
    templateRefName.start!, // inside the string literal
    FULL_FEATURES,
  ])
  tsCodeSegments.push(`], keyof __VLS_TemplateRefs>`)

  // Skip the original type parameters if user provided them
  if (call.typeParameters && call.typeParameters.params.length > 0) {
    currentOffset.value = call.typeParameters.end!
  }

  // Find the variable declaration for this useTemplateRef call to add to excludeBindings
  // We need to traverse up the AST to find the parent variable declaration
  _breakableTraverse(
    vineFileCtx.root,
    (node, ancestors) => {
      if (node === call) {
        const varDecl = ancestors.find(
          item => (
            isVariableDeclaration(item.node)
            && item.node.declarations.length === 1
            && isIdentifier(item.node.declarations[0].id)
          ),
        )?.node as (VariableDeclaration | undefined)
        if (varDecl) {
          excludeBindings.add(
            (varDecl.declarations[0].id as Identifier).name,
          )
        }
        throw exitTraverse
      }
    },
  )
}

export function* createStyleEmbeddedCodes(
  ctx: CodegenCtx,
): Generator<VirtualCode> {
  const { vineFileCtx } = ctx
  for (const styleDefines of Object.values(
    vineFileCtx.styleDefine,
  )) {
    for (const {
      lang,
      source: styleSource,
      range,
      compCtx,
      isExternalFilePathSource,
    } of styleDefines) {
      if (!range) {
        return
      }

      if (isExternalFilePathSource || !styleSource.trim().length) {
        // Don't recongnize this string argument
        // which is a path to an external file,
        // as CSS syntax format area
        continue
      }

      // Here we have user-defined style raw content,
      // String content parsed by @babel/parser would always be LF,
      // But for Volar location mapping we need to turn it back to CRLF.
      const source = vineFileCtx.isCRLF
        ? turnBackToCRLF(styleSource)
        : styleSource

      yield {
        id: `${compCtx.fnName}_style_${lang}`.toLowerCase(),
        languageId: lang,
        snapshot: {
          getText: (start, end) => source.slice(start, end),
          getLength: () => source.length,
          getChangeRange: () => undefined,
        },
        mappings: [
          {
            sourceOffsets: [range[0]],
            generatedOffsets: [0],
            lengths: [source.length],
            data: FULL_FEATURES,
          },
        ],
        embeddedCodes: [],
      }
    }
  }
}

export function* createTemplateHTMLEmbeddedCodes(
  ctx: CodegenCtx,
): Generator<VirtualCode> {
  const { vineFileCtx } = ctx
  for (const [i, {
    fnName,
    templateSource,
    templateStringNode,
  }] of Object.entries(vineFileCtx.vineCompFns)) {
    if (!templateStringNode) {
      continue
    }

    const source = vineFileCtx.isCRLF
      ? turnBackToCRLF(templateSource)
      : templateSource

    yield {
      id: `${i}_${fnName}_template`.toLowerCase(),
      languageId: 'html',
      snapshot: {
        getText: (start, end) => source.slice(start, end),
        getLength: () => source.length,
        getChangeRange: () => undefined,
      },
      mappings: [
        {
          sourceOffsets: [templateStringNode.quasi.quasis[0].start!],
          generatedOffsets: [0],
          lengths: [source.length],
          data: FULL_FEATURES,
        },
      ],
      embeddedCodes: [],
    }
  }
}

export function* createSourceVirtualCode(
  ctx: CodegenCtx,
): Generator<VirtualCode> {
  const { snapshotContent } = ctx
  yield {
    id: 'source',
    languageId: 'typescript',
    snapshot: {
      getText: (start, end) => snapshotContent.slice(start, end),
      getLength: () => snapshotContent.length,
      getChangeRange: () => undefined,
    },
    mappings: [
      {
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [snapshotContent.length],
        data: FULL_FEATURES,
      },
    ],
    embeddedCodes: [],
  }
}
