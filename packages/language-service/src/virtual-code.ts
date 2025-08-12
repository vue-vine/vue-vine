import type { BlockStatement } from '@babel/types'
import type { Mapping, VueCompilerOptions } from '@vue/language-core'
import type { Segment } from 'muggle-string'
import type ts from 'typescript'
import type { VineCodeInformation, VueVineVirtualCode } from './shared'
import path from 'node:path/posix'
import { isBlockStatement } from '@babel/types'
import { generateTemplate } from '@vue/language-core'
import { toString } from 'muggle-string'
import { createSourceVirtualCode, createStyleEmbeddedCodes, createTemplateHTMLEmbeddedCodes, generateComponentPropsAndContext, generatePrefixVirtualCode, generateScriptUntil, generateStyleScopedClasses, generateVirtualCodeByAstPositionSorted } from './codegen'
import { generateVLSContext, LINKED_CODE_TAG_PREFIX, LINKED_CODE_TAG_SUFFIX } from './injectTypes'
import { analyzeVineForVirtualCode } from './vine-ctx'

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
    if (!foundLeft || !foundRight) {
      continue
    }

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
  // const compileStartTime = performance.now()
  const {
    vineCompileErrs,
    vineCompileWarns,
    vineFileCtx,
  } = analyzeVineForVirtualCode(fileId, snapshotContent)
  // const compileTime = (performance.now() - compileStartTime).toFixed(2)
  // vlsInfoLog(`compile time cost: ${compileTime}ms -- ${fileId}`)

  const currentOffset = { value: 0 }
  const tsCodeSegments: Segment<VineCodeInformation>[] = []

  const codegenCtx = {
    currentOffset,
    tsCodeSegments,
    vineFileCtx,
    snapshotContent,
  }

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

  const firstVineCompFnDeclNode = vineFileCtx.vineCompFns[0]?.fnDeclNode
  if (firstVineCompFnDeclNode) {
    generateScriptUntil(codegenCtx, firstVineCompFnDeclNode.start!)
  }

  for (const vineCompFn of vineFileCtx.vineCompFns) {
    if (!vineCompFn.templateStringNode || !vineCompFn.templateReturn) {
      continue
    }

    const excludeBindings = new Set<string>()
    const tempVarDecls: string[] = []

    // Write out the component function's formal parameters
    generateComponentPropsAndContext(codegenCtx, vineCompFn)

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

      generateScriptUntil(codegenCtx, blockStartPos)
      generatePrefixVirtualCode(codegenCtx, vineCompFn)

      // Generate function body statements
      generateVirtualCodeByAstPositionSorted(codegenCtx, vineCompFn, {
        excludeBindings,
      })

      // after all statements in the function body
      generateScriptUntil(codegenCtx, vineCompFn.templateReturn.start!)
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
        generateStyleScopedClasses(codegenCtx)

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

      generateScriptUntil(codegenCtx, vineCompFn.templateStringNode.quasi.start!)

      // clear the template string
      tsCodeSegments.push(`\`\` as any as __VLS_VINE_VueVineComponent${vineCompFn.expose
        ? ` & { exposed: (import('vue').ShallowUnwrapRef<typeof __VLS_VINE_ComponentExpose__>) }`
        : ''
      };\n`)
      currentOffset.value = vineCompFn.templateStringNode.quasi.end!
    }

    generateScriptUntil(codegenCtx, vineCompFn.fnDeclNode!.end!)
    if (vineCompFn.isCustomElement) {
      tsCodeSegments.push(' as CustomElementConstructor);\n')
    }
  }
  generateScriptUntil(codegenCtx, snapshotContent.length)

  // Generate all full collection of all used components in this file
  const usedComponents = new Set<string>()
  vineFileCtx.vineCompFns.forEach((vineCompFn) => {
    usedComponents.add(vineCompFn.fnName)
    vineCompFn.templateComponentNames.forEach((compName) => {
      usedComponents.add(compName)
    })
  })
  tsCodeSegments.push(`\nconst __VLS_VINE_ComponentsReferenceMap = {\n${[...usedComponents].map(compName => `  '${compName}': ${compName}`).join(',\n')
  }\n};\n`)
  tsCodeSegments.push(`\nconst __VLS_IntrinsicElements = {} as __VLS_IntrinsicElements;`)

  const tsCode = toString(tsCodeSegments)
  const tsCodeMappings = buildMappings(tsCodeSegments)
  const linkedCodeMappings: Mapping[] = getLinkedCodeMappings(tsCode)

  return {
    __VUE_VINE_VIRTUAL_CODE__: true,
    id: 'root',
    languageId: 'typescript',
    fileName: fileId,
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
      // TemplateHTML must be the first one,
      // in order to avoid emmet feature lost
      ...createTemplateHTMLEmbeddedCodes(codegenCtx),
      ...createStyleEmbeddedCodes(codegenCtx),
      ...createSourceVirtualCode(codegenCtx),
    ],
    vineMetaCtx: {
      vineCompileErrs,
      vineCompileWarns,
      vineFileCtx,
    },
  }
}
