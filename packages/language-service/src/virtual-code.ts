import type { ArrowFunctionExpression, CallExpression, FunctionDeclaration, FunctionExpression } from '@babel/types'
import type { CodeInformation, Mapping, VirtualCode, VueCompilerOptions } from '@vue/language-core'
import type { VinePropMeta } from '@vue-vine/compiler'
import type { Segment } from 'muggle-string'
import type ts from 'typescript'
import type { BabelToken, SpawnLogger, VueVineCode } from './shared'
import path from 'node:path/posix'
import { isIdentifier, isTSTypeLiteral } from '@babel/types'
import { generateTemplate } from '@vue/language-core'
import { replaceAll, toString } from 'muggle-string'
import { createLinkedCodeTag, generateVLSContext, LINKED_CODE_TAG_PREFIX, LINKED_CODE_TAG_SUFFIX } from './injectTypes'
import { getVineTempPropName, turnBackToCRLF } from './shared'
import { compileVineForVirtualCode } from './vine-ctx'

type VineCodeInformation = CodeInformation & {
  __combineLastMapping?: boolean
  __combineOffsetMapping?: number
}
type VineCompFn = ReturnType<typeof compileVineForVirtualCode>['vineFileCtx']['vineCompFns'][number]
type BabelFunctionNodeTypes = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression

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
    const length = foundLeft.tagLength
    linkedCodeMappings.push({
      sourceOffsets: [start],
      generatedOffsets: [end],
      lengths: [length],
      data: undefined,
    })
  }

  return linkedCodeMappings
}

function getIndexAfterFnDeclLeftParen(
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
      return node.start! + 1 // '('.length
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
        mapping.data.__combineLastMapping
        || mapping.data.__combineOffsetMapping
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

export function createVueVineCode(
  ts: typeof import('typescript'),
  fileId: string,
  snapshotContent: string,
  compilerOptions: ts.CompilerOptions,
  vueCompilerOptions: VueCompilerOptions,
  target: 'extension' | 'tsc',
  logger?: SpawnLogger,
): VueVineCode {
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
    tsCodeSegments.push(`/// <reference types="${relativePath}" />\n\n`)
  }
  else {
    tsCodeSegments.push(`/// <reference types=".vue-global-types/vine_${vueCompilerOptions.lib}_${vueCompilerOptions.target}_true" />\n\n`)
  }

  let currentOffset = 0
  const firstVineCompFnDeclNode = vineFileCtx.vineCompFns[0]?.fnDeclNode
  if (firstVineCompFnDeclNode) {
    generateScriptUntil(firstVineCompFnDeclNode.start!)
  }

  for (const vineCompFn of vineFileCtx.vineCompFns) {
    if (!vineCompFn.templateStringNode || !vineCompFn.templateReturn) {
      continue
    }

    // Write out the component function's formal parameters
    generateComponentPropsAndContext(vineCompFn)

    // Need to extract all complex expression in `vineProp.withDefault`
    // and generate a temporary variable like `__VINE_VLS_1` and use `typeof __VINE_VLS_1`
    // as the type of that single prop.
    const tempVarDecls: string[] = []
    const isVineCompHasFnBlock = vineCompFn.fnItselfNode?.body?.type === 'BlockStatement'
    if (isVineCompHasFnBlock) {
      Object.entries(vineCompFn.props).forEach(([propName, propMeta]) => {
        const defaultValueExpr = propMeta.default
        if (!defaultValueExpr || propMeta.typeAnnotationRaw !== 'any') {
          return
        }

        const tempVarName = getVineTempPropName(propName)
        const tempVarDecl = `const ${tempVarName} = (${
          vineFileCtx.getAstNodeContent(defaultValueExpr)
        });`
        tempVarDecls.push(tempVarDecl)
        propMeta.typeAnnotationRaw = `typeof ${tempVarName}`
      })
    }

    generateLinkedCodeTagRightForMacros(vineCompFn)

    // Insert temp variables,
    // after all statements in the function body
    generateScriptUntil(vineCompFn.templateReturn.start!)
    if (isVineCompHasFnBlock && tempVarDecls.length > 0) {
      tsCodeSegments.push(...tempVarDecls)
      tsCodeSegments.push('\n\n')
    }

    // Generate the template virtual code
    for (const quasi of vineCompFn.templateStringNode.quasi.quasis) {
      tsCodeSegments.push('\n{ // --- Start: Template virtual code\n')

      // Insert all component bindings to __VLS_ctx
      tsCodeSegments.push(generateVLSContext(vineCompFn))

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
        edited: target === 'extension',
        inheritAttrs: false,
        templateRefNames: new Set(),
        destructuredPropNames: new Set(),
      })

      for (const segment of generatedTemplate) {
        if (typeof segment === 'string') {
          tsCodeSegments.push(segment)
        }
        else if (segment[1] === 'template') {
          if (
            typeof segment[3].completion === 'object'
            && segment[3].completion.isAdditional
            && !segment[3].completion.onlyImport
          ) {
            // fix https://github.com/vue-vine/vue-vine/pull/149#issuecomment-2347047385
            segment[3].completion.onlyImport = true
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
      tsCodeSegments.push('\n} // --- End: Template virtual code\n')
    }
    generateScriptUntil(vineCompFn.templateStringNode.quasi.start!)

    // clear the template string
    tsCodeSegments.push('`` as any as VueVineComponent')
    currentOffset = vineCompFn.templateStringNode.quasi.end!

    generateScriptUntil(vineCompFn.fnDeclNode!.end!)
  }
  generateScriptUntil(snapshotContent.length)

  // Add a 'VINE' prefix to all '__VLS_'
  replaceAll(
    tsCodeSegments,
    /__VLS_/g,
    '__VINE_VLS_',
  )

  const tsCode = toString(tsCodeSegments)
  const tsCodeMappings = buildMappings(tsCodeSegments)
  const linkedCodeMappings: Mapping[] = getLinkedCodeMappings(tsCode)

  logger?.log(`created in ${compileTime}ms.`)
  return {
    __VUE_VINE_VIRTUAL_CODE__: true,
    id: 'root',
    languageId: 'ts',
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
      snapshotContent.slice(currentOffset, targetOffset),
      undefined,
      currentOffset,
      FULL_FEATURES,
    ])
    currentOffset = targetOffset
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
      }${slot}: ${
        slotPropTypeLiteralNode
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

    const emitParam = `{${
      vineCompFn.emits.map((emit) => {
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
        }${onEmit}${
          isOptional ? '?' : ''
        }: __VLS_${vineCompFn.fnName}_emits__['${emit}']`
      }).filter(Boolean).join(', ')
    }\n}`

    return emitParam
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

    vineCompFn.linkedMacroCalls
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

    const contextFieldsStr = (
      contextProperties.length > 0
        ? `\n${' '.repeat(tabNum)}${contextProperties.join(`\n${' '.repeat(tabNum)}`)}${lineWrapAtStart ? `\n  \n` : '\n'}`
        : ''
    )
    const contextFormalParam = `${lineWrapAtStart ? `\n` : ''}context: {${contextFieldsStr}}`
    return contextFormalParam
  }

  function generateComponentPropsAndContext(vineCompFn: VineCompFn) {
    tsCodeSegments.push('\n')
    if (vineCompFn.propsDefinitionBy === 'macro') {
      tsCodeSegments.push(`\ntype __VLS_${vineCompFn.fnName}_props__ = ${vineCompFn.getPropsTypeRecordStr({
        isNeedLinkedCodeTag: true,
        joinStr: ',\n',
      })}\n`)
    }
    if (vineCompFn.emits.length > 0 && vineCompFn.emitsTypeParam) {
      tsCodeSegments.push(`\ntype __VLS_${vineCompFn.fnName}_emits__ = __VLS_NormalizeEmits<VueDefineEmits<${
        vineFileCtx.getAstNodeContent(vineCompFn.emitsTypeParam)
      }>>;\n`)
    }
    tsCodeSegments.push('\n')

    // Gurantee the component function has a `props` formal parameter in virtual code,
    // This is for props intellisense on editing template tag attrs.
    generateScriptUntil(
      getIndexAfterFnDeclLeftParen(
        vineCompFn.fnItselfNode!,
        vineFileCtx.root.tokens ?? [],
      ) + 1, // means generate after '(',
    )
    if (vineCompFn.propsDefinitionBy === 'macro') {
      // Define props by `vineProp`, no `props` formal parameter,
      // generate a `props` formal parameter in virtual code
      const propsParam = `\n  props: __VLS_${vineCompFn.fnName}_props__ & ${
        generateEmitProps(vineCompFn, 2)
      }, `
      tsCodeSegments.push(propsParam)

      // Generate `context: { ... }` after `props: ...`
      tsCodeSegments.push(generateContextFormalParam(vineCompFn))
    }
    else {
      // User provide a `props` formal parameter in the component function,
      // we should keep it in virtual code, and generate `context: ...` after it,
      const formalParamTypeNode = vineCompFn.propsFormalParamType!
      generateScriptUntil(formalParamTypeNode.end!)

      // Generate `context: { ... }` after `props: ...`
      tsCodeSegments.push(` & ${
        generateEmitProps(vineCompFn, 2)
      }, ${generateContextFormalParam(vineCompFn, {
        tabNum: 2,
        lineWrapAtStart: false,
      })}`)
    }
  }

  function generateLinkedCodeTagRightForMacros(vineCompFn: VineCompFn) {
    vineCompFn.linkedMacroCalls
      .sort(
        (
          { macroCall: a },
          { macroCall: b },
        ) => {
        // Sort by AST node start position
          return a.start! - b.start!
        },
      )
      .forEach(
        (macroInfo) => {
          if (macroInfo.macroType === 'vineProp') {
            generateLinkedCodeTagRightForVineProp(
              vineCompFn,
              macroInfo.macroMeta,
            )
          }
          else if (macroInfo.macroType === 'vineSlots') {
            generateLinkedCodeTagRightForVineSlots(
              macroInfo.macroCall,
            )
          }
          else if (macroInfo.macroType === 'vineEmits') {
            generateLinkedCodeTagRightForVineEmits(
              macroInfo.macroCall,
            )
          }
        },
      )
  }

  function generateLinkedCodeTagRightForVineProp(
    vineCompFn: VineCompFn,
    vinePropMeta: VinePropMeta,
  ) {
    // We should generate linked code tag as block comment
    // before the variable declared by `vineProp`
    if (vineCompFn.propsDefinitionBy !== 'macro') {
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
