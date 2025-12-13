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
const INDENT_2 = '  '
const INDENT_4 = '    '

// ===================== Utility Functions =====================

/**
 * Convert emit event name to Vue component props name (on-prefixed camelCase)
 */
export function convertEmitToOnHandler(emit: string): string {
  // Check if the emit name contains special characters (colon, underscore, dot, etc., but not hyphens)
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
 */
export function needsQuotes(propName: string): boolean {
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

  get currentOffset(): number {
    return this.offset
  }

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

  // ===================== Context Slots Generation =====================

  /**
   * Generate context slots definition
   */
  private* contextSlots(vineCompFn: VineCompFn, tabNum = 2): Generator<CodeSegment> {
    const innerIndent = ' '.repeat(tabNum + 2)
    const outerIndent = ' '.repeat(tabNum)

    yield 'slots: {'

    for (const slot of vineCompFn.slotsNamesInTemplate) {
      const slotPropTypeLiteralNode = vineCompFn.slots[slot]?.props

      // Newline and indent
      yield `\n${innerIndent}`

      // Linked code tag for non-default slots
      if (slot !== 'default') {
        yield createLinkedCodeTag('left', slot.length)
      }

      // Slot name
      yield slot
      yield ': '

      // Slot type
      if (slotPropTypeLiteralNode) {
        yield '(props: '
        yield this.vineFileCtx.getAstNodeContent(slotPropTypeLiteralNode)
        yield ') => any'
      }
      else {
        yield 'unknown'
      }

      // Comma separator (except for last item, but we add it anyway for trailing comma style)
      yield ', '
    }

    yield `\n${outerIndent}},`
  }

  // ===================== Emit Props Generation =====================

  /**
   * Generate single emit prop entry
   */
  private* emitPropEntry(
    emit: string,
    fnName: string,
    hasTypeParam: boolean,
  ): Generator<CodeSegment> {
    const onEmit = convertEmitToOnHandler(emit)
    const quotedPropName = needsQuotes(onEmit) ? `'${onEmit}'` : onEmit

    yield INDENT_4

    // Linked code tag if type param exists
    if (hasTypeParam) {
      yield createLinkedCodeTag('left', onEmit.length)
    }

    // Property name and type
    yield quotedPropName
    yield `?: __VLS_VINE_${fnName}_emits__['${emit}']`
  }

  /**
   * Generate emit props object
   */
  private* emitProps(vineCompFn: VineCompFn): Generator<CodeSegment> {
    yield '{'

    // Emit entries
    const emits = vineCompFn.emits
    for (let i = 0; i < emits.length; i++) {
      yield* this.emitPropEntry(
        emits[i],
        vineCompFn.fnName,
        !!vineCompFn.emitsTypeParam,
      )
      if (i < emits.length - 1) {
        yield ', '
      }
    }

    yield '\n'

    // Model update events
    for (const modelName of Object.keys(vineCompFn.vineModels)) {
      yield INDENT_4
      yield `'onUpdate:${modelName}'`
      yield `?: __VLS_VINE_${vineCompFn.fnName}_emits__['update:${modelName}']\n`
    }

    yield '}'
  }

  // ===================== Context Formal Param Generation =====================

  /**
   * Generate context formal parameter
   */
  * contextFormalParam(
    vineCompFn: VineCompFn,
    options: {
      tabNum?: number
      lineWrapAtStart?: boolean
    } = {},
  ): Generator<CodeSegment> {
    const { tabNum = 2, lineWrapAtStart = true } = options
    const indent = ' '.repeat(tabNum)

    // Leading newline if needed
    if (lineWrapAtStart) {
      yield '\n'
    }

    yield 'context: {'

    // Check if we have any context properties
    const hasSlots = vineCompFn.macrosInfoForVolar.some(m => m.macroType === 'vineSlots')
    const hasExpose = !!vineCompFn.expose

    if (hasSlots || hasExpose) {
      yield '\n'
      yield indent

      // Generate slots if present
      if (hasSlots) {
        yield* this.contextSlots(vineCompFn, tabNum)
      }

      // Generate expose if present
      if (hasExpose) {
        if (hasSlots) {
          yield `\n${indent}`
        }
        yield 'expose: __VLS_VINE.PickComponentExpose<typeof '
        yield vineCompFn.fnName
        yield '>,'
      }

      // Trailing formatting
      if (lineWrapAtStart) {
        yield '\n  \n'
      }
      else {
        yield '\n'
      }
    }

    yield '}'
  }

  // ===================== Props Type Generation =====================

  /**
   * Generate props type for macro or param definition
   */
  * propsType(
    type: 'param' | 'macro',
    vineCompFn: VineCompFn,
  ): Generator<CodeSegment, string> {
    const typeParts: string[] = []

    if (type === 'macro') {
      typeParts.push(`__VLS_VINE.VineComponentCommonProps & __VLS_VINE_${vineCompFn.fnName}_props__`)
    }
    else {
      // User provided props formal parameter
      const formalParamTypeNode = vineCompFn.propsFormalParamType
      if (formalParamTypeNode) {
        yield* this.scriptUntil(formalParamTypeNode.start!)
        yield `__VLS_VINE.VineComponentCommonProps & `
        yield* this.scriptUntil(formalParamTypeNode.end!)
        // For param type, we don't add props to typeParts here because
        // the props type is already yielded above for linked code tags.
        // We only need to collect emits and models for the return string.
      }
      else {
        // No user props, but we still need base props in the return string
        typeParts.push('__VLS_VINE.VineComponentCommonProps')
      }
    }

    // Collect emit props string
    const emitPropsSegments: string[] = []
    for (const seg of this.emitProps(vineCompFn)) {
      if (typeof seg === 'string') {
        emitPropsSegments.push(seg)
      }
    }
    const emitPropsStr = emitPropsSegments.join('')

    // Add emit props if not empty
    if (!EMPTY_OBJECT_TYPE_REGEXP.test(emitPropsStr)) {
      typeParts.push(emitPropsStr)
    }

    // Add model props type if models exist
    if (Object.keys(vineCompFn.vineModels).length > 0) {
      const modelPropsStr = `__VLS_VINE_${vineCompFn.fnName}_models__`
      typeParts.push(modelPropsStr)
    }

    // For param type with user props, we need to prepend ' & ' to connect with the yielded props type
    if (type === 'param' && vineCompFn.propsFormalParamType && typeParts.length > 0) {
      return ` & ${typeParts.filter(Boolean).join(' & ')},`
    }

    return `${typeParts.filter(Boolean).join(' & ')},`
  }

  // ===================== Prefix Virtual Code =====================

  /**
   * Generate prefix virtual code for component
   */
  * prefixVirtualCode(vineCompFn: VineCompFn): Generator<CodeSegment> {
    yield '\ntype '
    yield vineCompFn.fnName
    yield '_Props = Parameters<typeof '
    yield vineCompFn.fnName
    yield '>[0];\n\n'
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

    // Generate expose variable
    yield* this.scriptUntil(macroCall.start!)
    yield 'const __VLS_VINE_ComponentExpose__ = '
    yield [
      this.vineFileCtx.getAstNodeContent(paramObj),
      undefined,
      paramObj.start!,
      FULL_FEATURES,
    ]
    yield ';\n'

    // Replace paramObj with variable reference
    yield* this.scriptUntil(paramObj.start!)
    yield '__VLS_VINE_ComponentExpose__'
    this.offset = paramObj.end!
    yield* this.scriptUntil(macroCall.end!)
  }

  // ===================== Model Props Type =====================

  /**
   * Generate model props type definition
   */
  private* modelPropsType(vineCompFn: VineCompFn): Generator<CodeSegment> {
    yield '\ntype __VLS_VINE_'
    yield vineCompFn.fnName
    yield '_models__ = {'

    for (const [modelName, model] of Object.entries(vineCompFn.vineModels)) {
      const { modelNameAstNode, typeParameter, modifiersTypeParameter, modelModifiersName } = model
      const modelType = typeParameter
        ? this.vineFileCtx.getAstNodeContent(typeParameter)
        : 'unknown'
      const modifiersKeyType = modifiersTypeParameter
        ? this.vineFileCtx.getAstNodeContent(modifiersTypeParameter)
        : 'string'

      // Model name property
      yield `\n${INDENT_4}`
      if (modelNameAstNode) {
        yield [`'${modelName}'`, undefined, modelNameAstNode.start!, FULL_FEATURES]
      }
      else {
        yield `'${modelName}'`
      }
      yield `?: ${modelType},`

      // Model modifiers property
      yield `\n${INDENT_4}'${modelModifiersName}'`
      yield `?: Partial<Record<${modifiersKeyType}, true | undefined>>`
    }

    yield '\n};'
  }

  // ===================== Emits Helper Type =====================

  /**
   * Generate emits helper type definition
   */
  private* emitsHelperType(vineCompFn: VineCompFn): Generator<CodeSegment> {
    yield '\ntype __VLS_VINE_'
    yield vineCompFn.fnName
    yield '_emits__ = '

    const typeParts: string[] = []

    // From vineEmits
    if (vineCompFn.emits.length > 0) {
      const emitsType = vineCompFn.emitsTypeParam
        ? this.vineFileCtx.getAstNodeContent(vineCompFn.emitsTypeParam)
        : `{${vineCompFn.emits.map(emit => `'${emit}': any`).join(', ')}}`
      typeParts.push(`__VLS_NormalizeEmits<__VLS_VINE.VueDefineEmits<${emitsType}>>`)
    }

    // From vineModels
    if (Object.keys(vineCompFn.vineModels).length > 0) {
      const modelEntries = Object.entries(vineCompFn.vineModels)
        .map(([modelName, model]) => {
          const modelType = model.typeParameter
            ? this.vineFileCtx.getAstNodeContent(model.typeParameter)
            : 'unknown'
          return `'update:${modelName}': [${modelType}]`
        })
        .join(', ')
      typeParts.push(`{${modelEntries} }`)
    }

    yield typeParts.join(' & ')
    yield ';\n'
  }

  // ===================== Custom Element Conversion =====================

  /**
   * Handle custom element function declaration conversion
   */
  private* customElementConversion(vineCompFn: VineCompFn): Generator<CodeSegment> {
    let declNode: any = vineCompFn.fnDeclNode
    if (isExportNamedDeclaration(declNode)) {
      declNode = declNode.declaration
    }

    if (isFunctionDeclaration(declNode) && declNode.id && declNode.body) {
      // Convert function declaration to variable declaration with function expression
      yield* this.scriptUntil(declNode.start!)
      yield 'const '
      yield vineCompFn.fnName
      yield ' = (function '
      this.offset = declNode.id.end!
    }
    else if (isVariableDeclaration(declNode) && declNode.declarations) {
      const decl = declNode.declarations[0]
      if (decl.init) {
        // Wrap existing expression with parentheses
        yield* this.scriptUntil(decl.init.start!)
        yield '('
      }
    }
  }

  // ===================== Function Parameters =====================

  /**
   * Generate function parameters with props and context
   */
  private* functionParameters(vineCompFn: VineCompFn): Generator<CodeSegment> {
    // Generate until after opening parenthesis
    yield* this.scriptUntil(
      getIndexOfFnDeclLeftParen(
        vineCompFn.fnItselfNode!,
        this.vineFileCtx.root.tokens ?? [],
      ) + 1,
    )

    if (vineCompFn.propsDefinitionBy === VinePropsDefinitionBy.macro) {
      // Macro-defined props: generate props formal parameter
      yield `\n${INDENT_2}props: `
      const propsTypeStr: string = yield* this.propsType('macro', vineCompFn)
      yield propsTypeStr
      yield* this.contextFormalParam(vineCompFn)
    }
    else {
      // User-defined props
      const propsTypeStr: string = yield* this.propsType('param', vineCompFn)
      yield propsTypeStr
      yield* this.contextFormalParam(vineCompFn, {
        tabNum: 2,
        lineWrapAtStart: false,
      })
    }
  }

  // ===================== Component Props and Context =====================

  /**
   * Generate component props and context definitions
   */
  * componentPropsAndContext(vineCompFn: VineCompFn): Generator<CodeSegment> {
    // Generate macro-defined props type
    if (vineCompFn.propsDefinitionBy === VinePropsDefinitionBy.macro) {
      yield '\ntype __VLS_VINE_'
      yield vineCompFn.fnName
      yield '_props__ = '
      yield vineCompFn.getPropsTypeRecordStr({
        isNeedLinkedCodeTag: true,
        joinStr: ',\n',
        isNeedJsDoc: true,
      })
      yield '\n'
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

  // ===================== Linked Code Tags =====================

  /**
   * Generate linked code tag for vineProp
   */
  * linkedCodeTagForVineProp(
    vineCompFn: VineCompFn,
    vinePropMeta: VinePropMeta,
  ): Generator<CodeSegment> {
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

    for (const member of vineSlotsType.members) {
      if (
        !member
        || (member.type !== 'TSMethodSignature' && member.type !== 'TSPropertySignature')
        || !member.key
        || !isIdentifier(member.key)
      ) {
        continue
      }

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

    yield* this.scriptUntil(call.callee.end!)

    // Generate type parameter
    yield '<__VLS_TemplateRefs['
    yield [
      `'${refName}'`,
      undefined,
      templateRefName.start!,
      FULL_FEATURES,
    ]
    yield '], keyof __VLS_TemplateRefs>'

    // Skip original type parameters if present
    if (call.typeParameters && call.typeParameters.params.length > 0) {
      this.offset = call.typeParameters.end!
    }

    // Find and add variable declaration to excludeBindings
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
            excludeBindings.add((varDecl.declarations[0].id as Identifier).name)
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
      yield* this.processMacro(macroInfo, vineCompFn, excludeBindings)
    }
  }

  /**
   * Process a single macro
   */
  private* processMacro(
    macroInfo: VineCompFn['macrosInfoForVolar'][number],
    vineCompFn: VineCompFn,
    excludeBindings: Set<string>,
  ): Generator<CodeSegment> {
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

      case 'vineValidators':
        yield* this.vineValidators(macroInfo.macroCall, vineCompFn.fnName)
        break

      case 'vineStyle':
        yield* this.vineStyle(macroInfo.macroCall)
        break
    }
  }

  /**
   * Generate vineValidators type parameter
   */
  private* vineValidators(
    macroCall: CallExpression,
    fnName: string,
  ): Generator<CodeSegment> {
    yield* this.scriptUntil(macroCall.start! + 'vineValidators'.length)
    yield '<'
    yield fnName
    yield '_Props>'
    yield* this.scriptUntil(macroCall.end!)
  }

  /**
   * Skip vineStyle macro argument
   */
  private* vineStyle(macroCall: CallExpression): Generator<CodeSegment> {
    const arg = macroCall.arguments[0]
    yield* this.scriptUntil(arg.start!)
    yield '"..."'
    this.offset = arg.end!
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
          yield* this.styleScopedClassEntry(rangeStart, offset, classNameWithDot)
        }
      }
    }

    yield ';\n'
  }

  /**
   * Generate a single scoped class entry
   */
  private* styleScopedClassEntry(
    rangeStart: number,
    offset: number,
    classNameWithDot: string,
  ): Generator<CodeSegment> {
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

      // Skip external file paths and empty styles
      if (isExternalFilePathSource || !styleSource.trim().length) {
        continue
      }

      // Convert LF to CRLF if needed for Volar location mapping
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
        mappings: [{
          sourceOffsets: [range[0]],
          generatedOffsets: [0],
          lengths: [source.length],
          data: FULL_FEATURES,
        }],
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
  for (const [i, compFn] of Object.entries(vineFileCtx.vineCompFns)) {
    const { fnName, templateSource, templateStringNode } = compFn
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
      mappings: [{
        sourceOffsets: [templateStringNode.quasi.quasis[0].start!],
        generatedOffsets: [0],
        lengths: [source.length],
        data: FULL_FEATURES,
      }],
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
    mappings: [{
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [snapshotContent.length],
      data: FULL_FEATURES,
    }],
    embeddedCodes: [],
  }
}
