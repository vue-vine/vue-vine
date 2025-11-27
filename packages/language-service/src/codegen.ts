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

// ===================== Types =====================

export type CodeSegment = Segment<VineCodeInformation>

// ===================== Constants =====================

const FULL_FEATURES = {
  completion: true,
  format: true,
  navigation: true,
  semantic: true,
  structure: true,
  verification: true,
} satisfies CodeInformation

const EMPTY_OBJECT_TYPE_REGEXP = /\{\s*\}/

// ===================== Utility Functions =====================

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

// ===================== CodeGenerator Class =====================

/**
 * Generator-based code generator for Vue Vine virtual code.
 * Uses JavaScript generators to produce code segments in a declarative way.
 */
export class CodeGenerator {
  private offset = 0

  constructor(
    public readonly vineFileCtx: VineFileCtx,
    public readonly snapshotContent: string,
  ) {}

  /**
   * Get current offset position
   */
  get currentOffset(): number {
    return this.offset
  }

  /**
   * Set current offset position
   */
  set currentOffset(value: number) {
    this.offset = value
  }

  // ===================== Core Generation Methods =====================

  /**
   * Generate script content from current offset to target offset
   */
  * scriptUntil(targetOffset: number): Generator<CodeSegment> {
    yield [
      this.snapshotContent.slice(this.offset, targetOffset),
      undefined,
      this.offset,
      FULL_FEATURES,
    ]
    this.offset = targetOffset
  }

  // ===================== Component Context Generation =====================

  /**
   * Generate context slots definition
   */
  private generateContextSlotsStr(vineCompFn: VineCompFn, tabNum = 2): string {
    return `slots: {${vineCompFn.slotsNamesInTemplate.map((slot) => {
      const slotPropTypeLiteralNode = vineCompFn.slots[slot]?.props
      return `\n${' '.repeat(tabNum + 2)}${
        slot === 'default'
          ? ''
          : createLinkedCodeTag('left', slot.length)
      }${slot}: ${slotPropTypeLiteralNode
        ? `(props: ${this.vineFileCtx.getAstNodeContent(slotPropTypeLiteralNode)}) => any`
        : 'unknown'
      }`
    }).join(', ')}\n${' '.repeat(tabNum)}},`
  }

  /**
   * Generate emit props definition string
   */
  private generateEmitPropsStr(vineCompFn: VineCompFn): string {
    const indent = ' '.repeat(4)
    const emitParam = `{${
      vineCompFn.emits.map(
        (emit) => {
          const onEmit = convertEmitToOnHandler(emit)

          // Check if the property name needs quotes in object literal
          const quotedPropName = needsQuotes(onEmit) ? `'${onEmit}'` : onEmit
          const leftLinkCodeTag = vineCompFn.emitsTypeParam
            ? createLinkedCodeTag('left', onEmit.length)
            : ''

          return `${indent}${leftLinkCodeTag}${quotedPropName}?: __VLS_VINE_${vineCompFn.fnName}_emits__['${emit}']`
        },
      ).join(', ')
    }\n${
      // Model names need to have 'update:modelName' format event.
      // default as 'update:modelValue'
      Object.keys(vineCompFn.vineModels).map((modelName) => {
        return `${indent}'onUpdate:${modelName}'?: __VLS_VINE_${vineCompFn.fnName}_emits__['update:${modelName}']\n`
      }).join(', ')
    }}`

    return emitParam
  }

  /**
   * Generate context formal parameter string
   */
  generateContextFormalParamStr(
    vineCompFn: VineCompFn,
    options: {
      tabNum?: number
      lineWrapAtStart?: boolean
    } = {},
  ): string {
    const { tabNum = 2, lineWrapAtStart = true } = options
    const contextProperties: string[] = []

    vineCompFn.macrosInfoForVolar.forEach(({ macroType }) => {
      if (macroType === 'vineSlots') {
        const slotField = this.generateContextSlotsStr(vineCompFn, tabNum)
        if (slotField) {
          contextProperties.push(slotField)
        }
      }
    })

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
    return `${lineWrapAtStart ? `\n` : ''}context: {${contextFieldsStr}}`
  }

  // ===================== Props Type Generation =====================

  /**
   * Generate props type for macro or param definition
   */
  * propsType(
    type: 'param' | 'macro',
    vineCompFn: VineCompFn,
  ): Generator<CodeSegment, string> {
    let propTypeBase = ''
    if (type === 'macro') {
      propTypeBase = `__VLS_VINE.VineComponentCommonProps & __VLS_VINE_${vineCompFn.fnName}_props__`
    }
    else {
      // User provide a `props` formal parameter in the component function,
      // we should keep it in virtual code, and generate `context: ...` after it,
      const formalParamTypeNode = vineCompFn.propsFormalParamType
      if (formalParamTypeNode) {
        yield* this.scriptUntil(formalParamTypeNode.start!)
        // Insert common props before the user provided props type
        yield `__VLS_VINE.VineComponentCommonProps & `
        yield* this.scriptUntil(formalParamTypeNode.end!)
      }
    }

    const generatedEmitProps = this.generateEmitPropsStr(vineCompFn)
    const generatedModelProps = `__VLS_VINE_${vineCompFn.fnName}_models__`
    const emitProps = EMPTY_OBJECT_TYPE_REGEXP.test(generatedEmitProps) ? '' : generatedEmitProps
    const modelProps = EMPTY_OBJECT_TYPE_REGEXP.test(generatedModelProps) ? '' : generatedModelProps
    return `${[
      propTypeBase,
      emitProps,
      modelProps,
    ].filter(Boolean).join(' & ')},`
  }

  // ===================== Prefix Virtual Code =====================

  /**
   * Generate prefix virtual code for component
   */
  * prefixVirtualCode(vineCompFn: VineCompFn): Generator<CodeSegment> {
    // __VLS_VINE_ComponentProps__
    yield `\ntype ${vineCompFn.fnName}_Props = Parameters<typeof ${vineCompFn.fnName}>[0];\n\n`
  }

  // ===================== Vine Expose =====================

  /**
   * Generate vineExpose macro handling
   */
  * vineExpose(vineCompFn: VineCompFn): Generator<CodeSegment> {
    if (!vineCompFn.expose) {
      return
    }

    const { macroCall, paramObj } = vineCompFn.expose
    yield* this.scriptUntil(macroCall.start!)
    // __VLS_VINE_ComponentExpose__
    yield 'const __VLS_VINE_ComponentExpose__ = '
    yield vineCompFn.expose
      ? [
          this.vineFileCtx.getAstNodeContent(vineCompFn.expose.paramObj),
          undefined,
          vineCompFn.expose.paramObj.start!,
          FULL_FEATURES,
        ]
      : '{}'
    yield ';\n'

    yield* this.scriptUntil(paramObj.start!)
    yield '__VLS_VINE_ComponentExpose__'
    this.offset = paramObj.end!
    yield* this.scriptUntil(macroCall.end!)
  }

  // ===================== Component Props and Context =====================

  /**
   * Generate component props and context definitions
   */
  * componentPropsAndContext(vineCompFn: VineCompFn): Generator<CodeSegment> {
    // Generate macro-defined props type
    if (vineCompFn.propsDefinitionBy === VinePropsDefinitionBy.macro) {
      yield `\ntype __VLS_VINE_${vineCompFn.fnName}_props__ = ${vineCompFn.getPropsTypeRecordStr({
        isNeedLinkedCodeTag: true,
        joinStr: ',\n',
        isNeedJsDoc: true,
      })}\n`
    }

    // Generate model props type
    if (Object.keys(vineCompFn.vineModels).length > 0) {
      yield* this.modelPropsType(vineCompFn)
    }

    // Generate emits helper type
    const isNeedEmitsHelperType = (
      vineCompFn.emits.length > 0
      || Object.keys(vineCompFn.vineModels).length > 0
    )
    if (isNeedEmitsHelperType) {
      yield* this.emitsHelperType(vineCompFn)
    }

    // Handle custom element conversion
    if (vineCompFn.isCustomElement) {
      yield* this.customElementConversion(vineCompFn)
    }

    // Generate function parameters
    yield* this.functionParameters(vineCompFn)
  }

  /**
   * Generate model props type definition
   */
  private* modelPropsType(vineCompFn: VineCompFn): Generator<CodeSegment> {
    yield `\ntype __VLS_VINE_${vineCompFn.fnName}_models__ = {`
    const indent = ' '.repeat(4)

    for (const [modelName, model] of Object.entries(vineCompFn.vineModels)) {
      const { modelNameAstNode, typeParameter, modifiersTypeParameter, modelModifiersName } = model
      const modelType = typeParameter ? this.vineFileCtx.getAstNodeContent(typeParameter) : 'unknown'
      // Use specific modifier type if provided, otherwise fallback to generic string
      const modifiersKeyType = modifiersTypeParameter
        ? this.vineFileCtx.getAstNodeContent(modifiersTypeParameter)
        : 'string'

      if (modelNameAstNode) {
        yield `\n${indent}`
        yield [`'${modelName}'`, undefined, modelNameAstNode.start!, FULL_FEATURES]
        yield `?: ${modelType},`
      }
      else {
        yield `\n${indent}'${modelName}'?: ${modelType},`
      }
      yield `\n${indent}'${modelModifiersName}'?: Partial<Record<${modifiersKeyType}, true | undefined>>`
    }
    yield `\n};`
  }

  /**
   * Generate emits helper type definition
   */
  private* emitsHelperType(vineCompFn: VineCompFn): Generator<CodeSegment> {
    yield `\ntype __VLS_VINE_${vineCompFn.fnName}_emits__ = `
    const segments: string[] = []

    // From vineEmits
    if (vineCompFn.emits.length > 0) {
      segments.push(`__VLS_NormalizeEmits<__VLS_VINE.VueDefineEmits<${
        vineCompFn.emitsTypeParam
          ? this.vineFileCtx.getAstNodeContent(vineCompFn.emitsTypeParam)
          : `{${vineCompFn.emits.map(emit => `'${emit}': any`).join(', ')}}`
      }>>`)
    }

    // From vineModels
    if (Object.keys(vineCompFn.vineModels).length > 0) {
      segments.push(`{${
        Object.entries(vineCompFn.vineModels).map(
          ([modelName, model]) => `'update:${modelName}': [${model.typeParameter ? this.vineFileCtx.getAstNodeContent(model.typeParameter) : 'unknown'}]`,
        ).join(', ')
      } }`)
    }

    yield `${segments.join(' & ')}`
    yield ';\n'
  }

  /**
   * Handle custom element function declaration conversion
   */
  private* customElementConversion(vineCompFn: VineCompFn): Generator<CodeSegment> {
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
      yield* this.scriptUntil(declNode.start!)
      yield `const ${vineCompFn.fnName} = (function `
      // Move cursor to the end of identifier,
      // to remain its original parameters
      this.offset = declNode.id.end!
    }
    else if (
      isVariableDeclaration(declNode)
      && declNode.declarations
    ) {
      const decl = declNode.declarations[0]
      if (decl.init) {
        // since here is already a variable declaration,
        // we just need to append `as CustomElementConstructor` in the end of expression
        yield* this.scriptUntil(decl.init.start!)
        yield '('
      }
    }
  }

  /**
   * Generate function parameters with props and context
   */
  private* functionParameters(vineCompFn: VineCompFn): Generator<CodeSegment> {
    // Guarantee the component function has a `props` formal parameter in virtual code,
    // This is for props intellisense on editing template tag attrs.
    yield* this.scriptUntil(
      getIndexOfFnDeclLeftParen(
        vineCompFn.fnItselfNode!,
        this.vineFileCtx.root.tokens ?? [],
      ) + 1, // means generate after '(',
    )

    if (vineCompFn.propsDefinitionBy === VinePropsDefinitionBy.macro) {
      // Define props by `vineProp`, no `props` formal parameter,
      // generate a `props` formal parameter in virtual code
      yield '\n  props: '
      const propsTypeStr: string = yield* this.propsType('macro', vineCompFn)
      yield propsTypeStr

      // Generate `context: { ... }` after `props: ...`
      yield this.generateContextFormalParamStr(vineCompFn)
    }
    else {
      const propsTypeStr: string = yield* this.propsType('param', vineCompFn)
      yield propsTypeStr

      // Generate `context: { ... }` after `props: ...`
      yield `${this.generateContextFormalParamStr(vineCompFn, {
        tabNum: 2,
        lineWrapAtStart: false,
      })}`
    }
  }

  // ===================== Linked Code Tags =====================

  /**
   * Generate linked code tag for vineProp
   */
  * linkedCodeTagForVineProp(
    vineCompFn: VineCompFn,
    vinePropMeta: VinePropMeta,
  ): Generator<CodeSegment> {
    // We should generate linked code tag as block comment
    // before the variable declared by `vineProp`
    if (vineCompFn.propsDefinitionBy !== VinePropsDefinitionBy.macro) {
      return
    }
    const propsVarIdAstNode = vinePropMeta.macroDeclaredIdentifier
    if (!propsVarIdAstNode) {
      return
    }
    yield* this.scriptUntil(propsVarIdAstNode.start!)
    yield createLinkedCodeTag('right', propsVarIdAstNode.name.length)
  }

  /**
   * Generate linked code tag for vineSlots
   */
  * linkedCodeTagForVineSlots(macroCall: CallExpression): Generator<CodeSegment> {
    const vineSlotsType = macroCall.typeParameters?.params?.[0]
    if (!vineSlotsType || !isTSTypeLiteral(vineSlotsType)) {
      return
    }

    // Iterate every property in `vineSlots` type literal
    for (const member of vineSlotsType.members) {
      if (
        !member
        || (
          member.type !== 'TSMethodSignature'
          && member.type !== 'TSPropertySignature'
        )
        || !member.key
        || !isIdentifier(member.key)
      ) {
        continue
      }

      // Generate linked code tag as block comment
      // before the variable declared by `vineSlots`
      yield* this.scriptUntil(member.key.start!)
      yield createLinkedCodeTag('right', member.key.name.length)
    }
  }

  /**
   * Generate linked code tag for vineEmits
   */
  * linkedCodeTagForVineEmits(macroCall: CallExpression): Generator<CodeSegment> {
    const vineEmitsType = macroCall.typeParameters?.params?.[0]
    if (!vineEmitsType || !isTSTypeLiteral(vineEmitsType)) {
      return
    }

    for (const member of vineEmitsType.members) {
      if (
        !member
        || member.type !== 'TSPropertySignature'
        || !member.key
        || !isIdentifier(member.key)
      ) {
        continue
      }

      yield* this.scriptUntil(member.key.start!)
      yield createLinkedCodeTag('right', member.key.name.length)
    }
  }

  // ===================== Template Ref =====================

  /**
   * Generate useTemplateRef type parameters
   */
  * useTemplateRefTypeParams(
    call: CallExpression,
    excludeBindings: Set<string>,
  ): Generator<CodeSegment> {
    const templateRefName = call.arguments[0]
    if (!isStringLiteral(templateRefName)) {
      return
    }
    const refName = templateRefName.value

    const genCursor = call.callee.end!
    yield* this.scriptUntil(genCursor)

    // Always generate __VLS_TemplateRefs to maintain virtual code mapping for navigation
    yield `<__VLS_TemplateRefs[`
    yield [
      `'${refName}'`,
      undefined,
      templateRefName.start!, // inside the string literal
      FULL_FEATURES,
    ]
    yield `], keyof __VLS_TemplateRefs>`

    // Skip the original type parameters if user provided them
    if (call.typeParameters && call.typeParameters.params.length > 0) {
      this.offset = call.typeParameters.end!
    }

    // Find the variable declaration for this useTemplateRef call to add to excludeBindings
    // We need to traverse up the AST to find the parent variable declaration
    _breakableTraverse(
      this.vineFileCtx.root,
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

  // ===================== Virtual Code by AST Position =====================

  /**
   * Generate virtual code sorted by AST position
   */
  * virtualCodeByAstPositionSorted(
    vineCompFn: VineCompFn,
    context: { excludeBindings: Set<string> },
  ): Generator<CodeSegment> {
    const { excludeBindings } = context
    const sortedMacros = [...vineCompFn.macrosInfoForVolar].sort(
      ({ macroCall: a }, { macroCall: b }) => a.start! - b.start!,
    )

    for (const macroInfo of sortedMacros) {
      switch (macroInfo.macroType) {
        case 'vineProp':
          yield* this.linkedCodeTagForVineProp(vineCompFn, macroInfo.macroMeta)
          break
        case 'vineSlots':
          yield* this.linkedCodeTagForVineSlots(macroInfo.macroCall)
          break
        case 'vineEmits':
          yield* this.linkedCodeTagForVineEmits(macroInfo.macroCall)
          break
        case 'vineExpose':
          yield* this.vineExpose(vineCompFn)
          break
        case 'useTemplateRef':
          yield* this.useTemplateRefTypeParams(macroInfo.macroCall, excludeBindings)
          break
        case 'vineValidators': {
          const vineValidatorsMacroCall = macroInfo.macroCall
          yield* this.scriptUntil(
            vineValidatorsMacroCall.start! + 'vineValidators'.length,
          )
          yield `<${vineCompFn.fnName}_Props>`
          yield* this.scriptUntil(vineValidatorsMacroCall.end!)
          break
        }
        case 'vineStyle': {
          // Skip generate `vineStyle` macro call
          const vineStyleMacroCall = macroInfo.macroCall
          const arg = vineStyleMacroCall.arguments[0]
          yield* this.scriptUntil(arg.start!)
          // Skip the argument
          yield '"..."'
          this.offset = arg.end!
          break
        }
      }
    }
  }

  // ===================== Style Scoped Classes =====================

  /**
   * Generate style scoped classes type definition
   */
  * styleScopedClasses(): Generator<CodeSegment> {
    yield '\ntype __VLS_VINE_StyleScopedClasses = {}'
    for (const styleDefines of Object.values(this.vineFileCtx.styleDefine)) {
      for (const { source: styleSource, range, scoped } of styleDefines) {
        if (!range || !scoped) {
          continue
        }

        const [rangeStart] = range
        const classNames = parseCssClassNames(styleSource)
        for (const { offset, text: classNameWithDot } of classNames) {
          const realOffset = rangeStart + offset
          yield '\n & { '
          yield* wrapWith(
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
          )

          yield ': true }'
        }
      }
    }
    yield ';\n'
  }
}

// ===================== Embedded Code Generators =====================

/**
 * Create style embedded codes
 */
export function* createStyleEmbeddedCodes(
  vineFileCtx: VineFileCtx,
): Generator<VirtualCode> {
  for (const styleDefines of Object.values(vineFileCtx.styleDefine)) {
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
        // Don't recognize this string argument
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

/**
 * Create template HTML embedded codes
 */
export function* createTemplateHTMLEmbeddedCodes(
  vineFileCtx: VineFileCtx,
): Generator<VirtualCode> {
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

/**
 * Create source virtual code
 */
export function* createSourceVirtualCode(
  snapshotContent: string,
): Generator<VirtualCode> {
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
