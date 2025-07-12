import type { BlockStatement, CallExpression, Identifier, VariableDeclaration } from '@babel/types'
import type { VinePropMeta } from '@vue-vine/compiler'
import type { CodeInformation, Mapping, VirtualCode, VueCompilerOptions } from '@vue/language-core'
import type { Segment } from 'muggle-string'
import type ts from 'typescript'
import type { BabelFunctionNodeTypes, BabelToken, VineCodeInformation, VineCompFn, VueVineVirtualCode } from './shared'
import path from 'node:path/posix'
import { isBlockStatement, isIdentifier, isStringLiteral, isTSTypeLiteral, isVariableDeclaration } from '@babel/types'
import { _breakableTraverse, exitTraverse, VinePropsDefinitionBy } from '@vue-vine/compiler'
import { generateTemplate } from '@vue/language-core'
import { replaceAll, toString } from 'muggle-string'
import { createLinkedCodeTag, generateVLSContext, LINKED_CODE_TAG_PREFIX, LINKED_CODE_TAG_SUFFIX } from './injectTypes'
import { parseCssClassNames, turnBackToCRLF, wrapWith } from './shared'
import { compileVineForVirtualCode } from './vine-ctx'

const FULL_FEATURES = {
  completion: true,
  format: true,
  navigation: true,
  semantic: true,
  structure: true,
  verification: true,
} satisfies CodeInformation
const LINKED_CODE_LEFT_REGEXP = new RegExp(`${escapeStrForRegExp(LINKED_CODE_TAG_PREFIX)}_LEFT__#(?<itemLength>\\d+)${escapeStrForRegExp(LINKED_CODE_TAG_SUFFIX)}`, 'g')
const LINKED_CODE_RIGHT_REGEXP = new RegExp(`${escapeStrForRegExp(LINKED_CODE_TAG_PREFIX)}_RIGHT__#(?<itemLength>\\d+)${escapeStrForRegExp(LINKED_CODE_TAG_SUFFIX)}`, 'g')
const EMPTY_OBJECT_TYPE_REGEXP = /\{\s*\}/

function escapeStrForRegExp(str: string) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function getLinkedCodeTagMatch(matched: RegExpExecArray) {
  return {
    index: matched.index,
    tagLength: matched[0]?.length ?? 0,
    itemLength: Number(matched.groups?.itemLength ?? 0),
  }
}

function getLinkedCodeMappings(tsCode: string): Mapping[] {
  const linkedCodeMappings: Mapping[] = []

  const linkedCodeLeftFounds = [...tsCode.matchAll(LINKED_CODE_LEFT_REGEXP)].map(getLinkedCodeTagMatch)
  const linkedCodeRightFounds = [...tsCode.matchAll(LINKED_CODE_RIGHT_REGEXP)].map(getLinkedCodeTagMatch)
  for (let i = 0; i < linkedCodeLeftFounds.length; i++) {
    const foundLeft = linkedCodeLeftFounds[i]
    const foundRight = linkedCodeRightFounds[i]

    const start = foundLeft.index + foundLeft.tagLength
    const end = foundRight.index + foundRight.tagLength
    const length = foundLeft.itemLength
    linkedCodeMappings.push({
      sourceOffsets: [start],
      generatedOffsets: [end],
      lengths: [length],
      data: void 0,
    })
  }

  return linkedCodeMappings
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

function buildMappings(chunks: Segment<VineCodeInformation>[]) {
  let length = 0
  let lastValidMapping: Mapping<VineCodeInformation> | undefined

  const mappings: Mapping<VineCodeInformation>[] = []
  for (const segment of chunks) {
    if (typeof segment === 'string') {
      length += segment.length
    }
    else {
      const mapping: Mapping<VineCodeInformation> = {
        lengths: [segment[0].length],
        generatedOffsets: [length],
        sourceOffsets: [segment[2]],
        data: segment[3]!,
      }

      // Handling combine mapping
      const isNeedCombine = (
        mapping.data.__combineOffset
        // ... maybe more conditions
      )

      if (isNeedCombine && lastValidMapping) {
        lastValidMapping.sourceOffsets.push(...mapping.sourceOffsets)
        lastValidMapping.generatedOffsets.push(...mapping.generatedOffsets)
        lastValidMapping.lengths.push(...mapping.lengths)
      }
      else {
        mappings.push(mapping)
        lastValidMapping = mapping
      }

      length += segment[0].length
    }
  }

  return mappings
}

export function createVueVineVirtualCode(
  ts: typeof import('typescript'),
  fileId: string,
  snapshotContent: string,
  compilerOptions: ts.CompilerOptions,
  vueCompilerOptions: VueCompilerOptions,
  _target: 'extension' | 'tsc',
): VueVineVirtualCode {
  // Compile `.vine.ts` with Vine's own compiler
  const compileStartTime = performance.now()
  const {
    vineCompileErrs,
    vineCompileWarns,
    vineFileCtx,
  } = compileVineForVirtualCode(fileId, snapshotContent)
  const compileTime = (performance.now() - compileStartTime).toFixed(2)

  const tsCodeSegments: Segment<VineCodeInformation>[] = []

  if (typeof vueCompilerOptions.__setupedGlobalTypes === 'object') {
    const globalTypes = vueCompilerOptions.__setupedGlobalTypes
    let relativePath = path.relative(
      path.dirname(vineFileCtx.fileId),
      globalTypes.absolutePath,
    )
    if (
      relativePath !== globalTypes.absolutePath
      && !relativePath.startsWith('./')
      && !relativePath.startsWith('../')
    ) {
      relativePath = `./${relativePath}`
    }
    tsCodeSegments.push(`/// <reference types="${relativePath}" />\n`)
  }
  else {
    tsCodeSegments.push(`/// <reference types=".vue-global-types/vine_${vueCompilerOptions.lib}_${vueCompilerOptions.target}_true" />\n`)
  }

  let currentOffset = { value: 0 }
  const firstVineCompFnDeclNode = vineFileCtx.vineCompFns[0]?.fnDeclNode
  if (firstVineCompFnDeclNode) {
    generateScriptUntil(firstVineCompFnDeclNode.start!)
  }

  for (const vineCompFn of vineFileCtx.vineCompFns) {
    if (!vineCompFn.templateStringNode || !vineCompFn.templateReturn) {
      continue
    }

    const excludeBindings = new Set<string>()
    const tempVarDecls: string[] = []

    // Write out the component function's formal parameters
    generateComponentPropsAndContext(vineCompFn)

    const isVineCompHasFnBlock = isBlockStatement(vineCompFn.fnItselfNode?.body)
    if (isVineCompHasFnBlock) {
      // Generate until the first function body statement
      const firstStmt = (vineCompFn.fnItselfNode?.body as BlockStatement).body[0]
      let blockStartPos = firstStmt.start!

      // If the first statement has JSDoc,
      // the start position should be the start of the JSDoc
      if (firstStmt.leadingComments?.length) {
        const jsDocStartPos = firstStmt.leadingComments[0].start!
        if (jsDocStartPos < blockStartPos) {
          blockStartPos = jsDocStartPos
        }
      }

      generateScriptUntil(blockStartPos)
      generatePrefixVirtualCode(vineCompFn)

      // Generate function body statements
      generateVirtualCodeByAstPositionSorted(vineCompFn, {
        excludeBindings,
      })

      // after all statements in the function body
      generateScriptUntil(vineCompFn.templateReturn.start!)
      if (isVineCompHasFnBlock && tempVarDecls.length > 0) {
        tsCodeSegments.push(...tempVarDecls)
        tsCodeSegments.push('\n\n')
      }

      // Generate the template virtual code
      const templateRefNames = vineCompFn.templateRefNames
      const destructuredPropNames = new Set(Object.keys(vineCompFn.propsDestructuredNames))

      for (const quasi of vineCompFn.templateStringNode.quasi.quasis) {
        tsCodeSegments.push('\n// --- Start: Template virtual code\n')

        // Insert all component bindings to __VLS_ctx
        tsCodeSegments.push(generateVLSContext(vineCompFn, {
          excludeBindings,
        }))

        // Insert `__VLS_StyleScopedClasses`
        generateStyleScopedClasses()

        const generatedTemplate = generateTemplate({
          ts,
          compilerOptions,
          vueCompilerOptions,
          template: {
            ast: vineCompFn.templateAst,
            errors: [],
            warnings: [],
            name: 'template',
            start: vineCompFn.templateStringNode.start!,
            end: vineCompFn.templateStringNode.end!,
            startTagEnd: quasi.start!,
            endTagStart: quasi.end!,
            lang: 'html',
            content: vineCompFn.templateSource,
            attrs: {},
          },
          scriptSetupBindingNames: new Set(),
          scriptSetupImportComponentNames: new Set(),
          inheritAttrs: false,
          templateRefNames,
          destructuredPropNames,

          // Slots type virtual code helper
          hasDefineSlots: Object.keys(vineCompFn.slots).length > 0,
          slotsAssignName: 'context.slots',
        })

        for (const segment of generatedTemplate) {
          if (typeof segment === 'string') {
            tsCodeSegments.push(segment)
          }
          else if (segment[1] === 'template') {
            if (
              typeof segment[3].completion === 'object'
              && segment[3].completion.isAdditional
            ) {
              // - fix https://github.com/vue-vine/vue-vine/pull/149#issuecomment-2347047385
              if (!segment[3].completion.onlyImport) {
                segment[3].completion.onlyImport = true
              }
              else {
                // - fix https://github.com/vue-vine/vue-vine/issues/218
                segment[3].completion = {}
              }
            }

            tsCodeSegments.push([
              segment[0],
              undefined,
              segment[2] + quasi.start!,
              segment[3],
            ])
          }
          else {
            tsCodeSegments.push(segment[0])
          }
        }
        tsCodeSegments.push('\n// --- End: Template virtual code\n\n')
      }

      generateScriptUntil(vineCompFn.templateStringNode.quasi.start!)

      // clear the template string
      tsCodeSegments.push(`\`\` as any as __VLS_VueVineComponent${vineCompFn.expose
        ? ` & { exposed: (import('vue').ShallowUnwrapRef<typeof __VLS_ComponentExpose__>) }`
        : ''
      };\n`)
      currentOffset.value = vineCompFn.templateStringNode.quasi.end!
    }

    generateScriptUntil(vineCompFn.fnDeclNode!.end!)
    if (vineCompFn.isCustomElement) {
      tsCodeSegments.push(' as CustomElementConstructor);\n')
    }
  }
  generateScriptUntil(snapshotContent.length)

  // Generate all full collection of all used components in this file
  const usedComponents = new Set<string>()
  vineFileCtx.vineCompFns.forEach((vineCompFn) => {
    usedComponents.add(vineCompFn.fnName)
    vineCompFn.templateComponentNames.forEach((compName) => {
      usedComponents.add(compName)
    })
  })
  tsCodeSegments.push(`\nconst __VLS_ComponentsReferenceMap = {\n${[...usedComponents].map(compName => `  '${compName}': ${compName}`).join(',\n')
  }\n};\n`)
  tsCodeSegments.push(`\nconst __VLS_IntrinsicElements = {} as __VLS_IntrinsicElements;`)

  // Add a 'VINE' prefix to all '__VLS_'
  replaceAll(
    tsCodeSegments,
    /__VLS_/g,
    '__VINE_VLS_',
  )

  const tsCode = toString(tsCodeSegments)
  const tsCodeMappings = buildMappings(tsCodeSegments)
  const linkedCodeMappings: Mapping[] = getLinkedCodeMappings(tsCode)

  return {
    __VUE_VINE_VIRTUAL_CODE__: true,
    id: 'root',
    languageId: 'typescript',
    snapshot: {
      getLength() {
        return tsCode.length
      },
      getText(start, end) {
        return tsCode.substring(start, end)
      },
      getChangeRange() {
        return undefined
      },
    },
    mappings: tsCodeMappings,
    linkedCodeMappings,
    embeddedCodes: [
      ...createTemplateHTMLEmbeddedCodes(),
      ...createStyleEmbeddedCodes(),
    ],
    vineMetaCtx: {
      vineCompileErrs,
      vineCompileWarns,
      vineFileCtx,
    },

    get fileName() {
      return fileId
    },
    get compileTime() {
      return compileTime
    },
  }

  function generateScriptUntil(targetOffset: number) {
    tsCodeSegments.push([
      snapshotContent.slice(currentOffset.value, targetOffset),
      undefined,
      currentOffset.value,
      FULL_FEATURES,
    ])
    currentOffset.value = targetOffset
  }

  function generateContextSlots(
    vineCompFn: VineCompFn,
    tabNum = 2,
  ) {
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

  function generateEmitProps(
    vineCompFn: VineCompFn,
    tabNum = 2,
  ) {
    const { emitsTypeParam } = vineCompFn
    const emitsOptionalKeys = (emitsTypeParam?.members?.map(
      member => (
        member.type === 'TSPropertySignature'
        && member.key
        && isIdentifier(member.key)
        && member.optional
          ? member.key.name
          : null
      ),
    ).filter(Boolean) ?? []) as string[]

    const emitParam = `{${vineCompFn.emits.map((emit) => {
      // Convert `emit` to a camelCase Name
      const camelCaseEmit = emit.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const onEmit = `on${camelCaseEmit.charAt(0).toUpperCase()}${camelCaseEmit.slice(1)}`
      const isOptional = (
        vineCompFn.emitsDefinitionByNames
        || (emitsOptionalKeys.length && emitsOptionalKeys.includes(emit))
      )

      return `\n${' '.repeat(tabNum + 2)}${
        // '/* left linkCodeTag here ... */'
        vineCompFn.emitsTypeParam
          ? createLinkedCodeTag('left', onEmit.length)
          : ''
      }${onEmit}${isOptional ? '?' : ''
      }: __VLS_${vineCompFn.fnName}_emits__['${emit}']`
    }).filter(Boolean).join(', ')
    }\n}`

    return emitParam
  }

  function generateModelProps(
    vineCompFn: VineCompFn,
    tabNum = 2,
  ) {
    const modelProps = `{${Object.entries(vineCompFn.vineModels).map(([modelName, model]) => {
      const { typeParameter } = model
      return `\n${' '.repeat(tabNum + 2)}${modelName}: ${typeParameter ? vineFileCtx.getAstNodeContent(typeParameter) : 'unknown'}`
    }).join(', ')
    }\n}`
    return modelProps
  }

  function generatePrefixVirtualCode(vineCompFn: VineCompFn) {
    // __VLS_ComponentProps__
    tsCodeSegments.push(`\ntype ${vineCompFn.fnName}_Props = Parameters<typeof ${vineCompFn.fnName}>[0];\n\n`)
  }

  function generateVineExpose(vineCompFn: VineCompFn) {
    if (!vineCompFn.expose) {
      return
    }

    const { macroCall, paramObj } = vineCompFn.expose
    generateScriptUntil(macroCall.start!)
    // __VLS_ComponentExpose__
    tsCodeSegments.push('const __VLS_ComponentExpose__ = ')
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

    generateScriptUntil(paramObj.start!)
    tsCodeSegments.push('__VLS_ComponentExpose__')
    currentOffset.value = paramObj.end!
    generateScriptUntil(macroCall.end!)
  }

  function generateContextFormalParam(
    vineCompFn: VineCompFn,
    {
      tabNum = 2,
      lineWrapAtStart = true,
    }: {
      tabNum?: number
      lineWrapAtStart?: boolean
    } = {},
  ) {
    // Generate `context: { ... }` after `props: ...`
    const contextProperties: string[] = []

    vineCompFn.macrosInfoForVolar
      .forEach(
        ({ macroType }) => {
          if (macroType === 'vineSlots') {
            const slotField = generateContextSlots(vineCompFn, tabNum)
            if (!slotField)
              return
            contextProperties.push(slotField)
          }
        },
      )

    // Generate `expose: (exposed: ExposedType) => void`
    if (vineCompFn.expose) {
      contextProperties.push(
        `expose: __VLS_PickComponentExpose<typeof ${vineCompFn.fnName}>,`,
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

  function generatePropsType(
    type: 'param' | 'macro',
    vineCompFn: VineCompFn,
  ) {
    let propTypeBase = ''
    if (type === 'macro') {
      propTypeBase = `__VLS_VineComponentCommonProps & __VLS_${vineCompFn.fnName}_props__`
    }
    else {
      // User provide a `props` formal parameter in the component function,
      // we should keep it in virtual code, and generate `context: ...` after it,
      const formalParamTypeNode = vineCompFn.propsFormalParamType
      if (formalParamTypeNode) {
        generateScriptUntil(formalParamTypeNode.start!)
        // Insert common props before the user provided props type
        tsCodeSegments.push('__VLS_VineComponentCommonProps & ')
        generateScriptUntil(formalParamTypeNode.end!)
      }
    }

    const generatedEmitProps = generateEmitProps(vineCompFn)
    const generatedModelProps = generateModelProps(vineCompFn)
    const emitProps = EMPTY_OBJECT_TYPE_REGEXP.test(generatedEmitProps) ? '' : ` & ${generatedEmitProps}`
    const modelProps = EMPTY_OBJECT_TYPE_REGEXP.test(generatedModelProps) ? '' : ` & ${generatedModelProps}`
    return `${[
      propTypeBase,
      emitProps,
      modelProps,
    ].filter(Boolean).join(' ')},`
  }

  function generateComponentPropsAndContext(vineCompFn: VineCompFn) {
    if (vineCompFn.propsDefinitionBy === VinePropsDefinitionBy.macro) {
      tsCodeSegments.push(`\ntype __VLS_${vineCompFn.fnName}_props__ = ${vineCompFn.getPropsTypeRecordStr({
        isNeedLinkedCodeTag: true,
        joinStr: ',\n',
        isNeedJsDoc: true,
      })}\n`)
    }
    if (vineCompFn.emits.length > 0 && vineCompFn.emitsTypeParam) {
      tsCodeSegments.push(`\ntype __VLS_${vineCompFn.fnName}_emits__ = __VLS_NormalizeEmits<VueDefineEmits<${vineFileCtx.getAstNodeContent(vineCompFn.emitsTypeParam)
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
        generateScriptUntil(declNode.start!)
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
          generateScriptUntil(decl.init.start!)
          tsCodeSegments.push('(')
        }
      }
    }

    // Gurantee the component function has a `props` formal parameter in virtual code,
    // This is for props intellisense on editing template tag attrs.
    generateScriptUntil(
      getIndexOfFnDeclLeftParen(
        vineCompFn.fnItselfNode!,
        vineFileCtx.root.tokens ?? [],
      ) + 1, // means generate after '(',
    )
    if (vineCompFn.propsDefinitionBy === VinePropsDefinitionBy.macro) {
      // Define props by `vineProp`, no `props` formal parameter,
      // generate a `props` formal parameter in virtual code
      tsCodeSegments.push('\n  props: ')
      tsCodeSegments.push(generatePropsType('macro', vineCompFn))

      // Generate `context: { ... }` after `props: ...`
      tsCodeSegments.push(
        generateContextFormalParam(vineCompFn),
      )
    }
    else {
      tsCodeSegments.push(generatePropsType('param', vineCompFn))

      // Generate `context: { ... }` after `props: ...`
      tsCodeSegments.push(`${generateContextFormalParam(vineCompFn, {
        tabNum: 2,
        lineWrapAtStart: false,
      })}`)
    }
  }

  function generateVirtualCodeByAstPositionSorted(
    vineCompFn: VineCompFn,
    context: {
      excludeBindings: Set<string>
    },
  ) {
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
                vineCompFn,
                macroInfo.macroMeta,
              )
              break
            case 'vineSlots':
              generateLinkedCodeTagRightForVineSlots(
                macroInfo.macroCall,
              )
              break
            case 'vineEmits':
              generateLinkedCodeTagRightForVineEmits(
                macroInfo.macroCall,
              )
              break
            case 'vineExpose':
              generateVineExpose(vineCompFn)
              break
            case 'useTemplateRef':
              generateUseTemplateRefTypeParams(
                macroInfo.macroCall,
                excludeBindings,
              )
              break
            case 'vineValidators': {
              const vineValidatorsMacroCall = macroInfo.macroCall
              generateScriptUntil(
                vineValidatorsMacroCall.start! + 'vineValidators'.length,
              )
              tsCodeSegments.push(`<${vineCompFn.fnName}_Props>`)
              generateScriptUntil(vineValidatorsMacroCall.end!)
              break
            }
            case 'vineStyle': {
              // Skip generate `vineStyle` macro call
              const vineStyleMacroCall = macroInfo.macroCall
              const arg = vineStyleMacroCall.arguments[0]
              generateScriptUntil(arg.start!)
              // Skip the argument
              tsCodeSegments.push('"..."')
              currentOffset.value = arg.end!
              break
            }
          }
        },
      )
  }

  function generateStyleScopedClasses() {
    tsCodeSegments.push('\ntype __VLS_StyleScopedClasses = {}')
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

  function generateLinkedCodeTagRightForVineProp(
    vineCompFn: VineCompFn,
    vinePropMeta: VinePropMeta,
  ) {
    // We should generate linked code tag as block comment
    // before the variable declared by `vineProp`
    if (vineCompFn.propsDefinitionBy !== VinePropsDefinitionBy.macro) {
      return
    }
    const propsVarIdAstNode = vinePropMeta.macroDeclaredIdentifier
    if (!propsVarIdAstNode) {
      return
    }
    generateScriptUntil(propsVarIdAstNode.start!)
    tsCodeSegments.push(createLinkedCodeTag('right', propsVarIdAstNode.name.length))
  }

  function generateLinkedCodeTagRightForVineSlots(
    macroCall: CallExpression,
  ) {
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
      generateScriptUntil(member.key.start!)
      tsCodeSegments.push(createLinkedCodeTag('right', member.key.name.length))
    })
  }

  function generateLinkedCodeTagRightForVineEmits(
    macroCall: CallExpression,
  ) {
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

      generateScriptUntil(member.key.start!)
      tsCodeSegments.push(createLinkedCodeTag('right', member.key.name.length))
    })
  }

  function generateUseTemplateRefTypeParams(
    call: CallExpression,
    excludeBindings: Set<string>,
  ) {
    const templateRefName = call.arguments[0]
    if (!isStringLiteral(templateRefName)) {
      return
    }
    const refName = templateRefName.value

    let genCursor = call.callee.end!
    generateScriptUntil(genCursor)

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

  function* createStyleEmbeddedCodes(): Generator<VirtualCode> {
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

  function* createTemplateHTMLEmbeddedCodes(): Generator<VirtualCode> {
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
}
