import type { BlockStatement } from '@babel/types'
import type { Mapping, VueCompilerOptions } from '@vue/language-core'
import type { Segment } from 'muggle-string'
import type ts from 'typescript'
import type { CodeSegment, VineCodeInformation, VueVineVirtualCode } from './shared'
import { isBlockStatement } from '@babel/types'
import { VineBindingTypes } from '@vue-vine/compiler'
import { generateTemplate } from '@vue/language-core'
import { toString } from 'muggle-string'
import { CodeGenerator, createSourceVirtualCode, createStyleEmbeddedCodes, createTemplateHTMLEmbeddedCodes, needsQuotes } from './codegen'
import { generateVLSContext } from './injectTypes'
import { analyzeVineForVirtualCode } from './vine-ctx'

function toPascalCase(name: string) {
  return name.split('-').filter(Boolean).map(
    part => part[0].toUpperCase() + part.slice(1),
  ).join('')
}

function buildMappings(chunks: Segment<VineCodeInformation>[]) {
  let length = 0
  const mappings: Mapping<VineCodeInformation>[] = []
  for (const segment of chunks) {
    if (typeof segment === 'string') {
      length += segment.length
    }
    else {
      mappings.push({
        sourceOffsets: [segment[2]],
        generatedOffsets: [length],
        lengths: [segment[0].length],
        data: segment[3]!,
      })
      length += segment[0].length
    }
  }
  return mappings
}

function postProcessMappings(mappings: Mapping<VineCodeInformation>[]) {
  const newMappings: Mapping<VineCodeInformation>[] = []
  const linkedCodeMappings: Mapping[] = []
  const combineTokenMappings = new Map<symbol, Mapping>()
  const linkedTokenMappings = new Map<symbol, Mapping>()

  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i]

    // __combineToken: merge mappings sharing the same Symbol token
    if (mapping.data.__combineToken !== undefined) {
      const token = mapping.data.__combineToken
      if (combineTokenMappings.has(token)) {
        const firstMapping = combineTokenMappings.get(token)!
        firstMapping.sourceOffsets.push(...mapping.sourceOffsets)
        firstMapping.generatedOffsets.push(...mapping.generatedOffsets)
        firstMapping.lengths.push(...mapping.lengths)
      }
      else {
        combineTokenMappings.set(token, mapping)
        newMappings.push(mapping)
      }
      continue
    }

    // __linkedToken: create linked code mapping between two locations
    if (mapping.data.__linkedToken !== undefined) {
      const token = mapping.data.__linkedToken
      if (linkedTokenMappings.has(token)) {
        const prevMapping = linkedTokenMappings.get(token)!
        linkedCodeMappings.push({
          sourceOffsets: [prevMapping.generatedOffsets[0]],
          generatedOffsets: [mapping.generatedOffsets[0]],
          lengths: [Number(token.description)],
          data: undefined,
        })
      }
      else {
        linkedTokenMappings.set(token, mapping)
      }
      continue
    }

    newMappings.push(mapping)
  }

  return { mappings: newMappings, linkedCodeMappings }
}

/**
 * Collect all segments from a generator into an array
 */
function collectSegments(generator: Generator<CodeSegment>): CodeSegment[] {
  return [...generator]
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

  const tsCodeSegments: CodeSegment[] = []
  const codegen = new CodeGenerator(vineFileCtx, snapshotContent)

  // Vue language core static type helpers
  // Import Vine internal types for virtual code type definitions
  tsCodeSegments.push(`/// <reference types="vue-vine/vls-helpers" />\n`)
  tsCodeSegments.push(`/// <reference types="vue-vine/macros" />\n`)
  tsCodeSegments.push(`import * as __VLS_VINE from 'vue-vine/internals';\n`)

  const firstVineCompFnDeclNode = vineFileCtx.vineCompFns[0]?.fnDeclNode
  if (firstVineCompFnDeclNode) {
    tsCodeSegments.push(...collectSegments(codegen.scriptUntil(firstVineCompFnDeclNode.start!)))
  }

  for (const vineCompFn of vineFileCtx.vineCompFns) {
    if (!vineCompFn.templateStringNode || !vineCompFn.templateReturn) {
      continue
    }

    const excludeBindings = new Set<string>()
    const tempVarDecls: string[] = []

    // Write out the component function's formal parameters
    tsCodeSegments.push(...collectSegments(codegen.componentPropsAndContext(vineCompFn)))

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

      tsCodeSegments.push(...collectSegments(codegen.scriptUntil(blockStartPos)))
      tsCodeSegments.push(...collectSegments(codegen.prefixVirtualCode(vineCompFn)))

      // Generate function body statements
      tsCodeSegments.push(...collectSegments(codegen.virtualCodeByAstPositionSorted(vineCompFn, {
        excludeBindings,
      })))

      // after all statements in the function body
      tsCodeSegments.push(...collectSegments(codegen.scriptUntil(vineCompFn.templateReturn.start!)))
      if (isVineCompHasFnBlock && tempVarDecls.length > 0) {
        tsCodeSegments.push(...tempVarDecls)
        tsCodeSegments.push('\n\n')
      }

      // Generate the template virtual code
      for (const quasi of vineCompFn.templateStringNode.quasi.quasis) {
        tsCodeSegments.push('\n// --- Start: Template virtual code\n')

        // Insert all component bindings to __VLS_ctx
        tsCodeSegments.push(...collectSegments(generateVLSContext(vineCompFn, {
          excludeBindings,
        })))

        // Insert `__VLS_StyleScopedClasses`
        tsCodeSegments.push(...collectSegments(codegen.styleScopedClasses()))

        // Collect all setup consts and refs
        const setupConsts = new Set<string>()
        const setupRefs = new Set<string>()
        for (const [name, bindingType] of Object.entries(vineCompFn.bindings)) {
          if (bindingType === VineBindingTypes.SETUP_CONST) {
            setupConsts.add(name)
          }
          else if (bindingType === VineBindingTypes.SETUP_REF) {
            setupRefs.add(name)
          }
        }

        const generatedTemplate = generateTemplate({
          typescript: ts,
          vueCompilerOptions,
          componentName: vineCompFn.fnName,
          template: {
            // `templateAst` type is not correct before Vapor finalized
            ast: vineCompFn.templateAst as any,
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
          setupConsts,
          setupRefs,
          inheritAttrs: false,

          // Slots type virtual code helper
          hasDefineSlots: Object.keys(vineCompFn.slots).length > 0,
          slotsAssignName: 'context.slots',
        })

        for (const segment of generatedTemplate.codes) {
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

      tsCodeSegments.push(...collectSegments(codegen.scriptUntil(vineCompFn.templateStringNode.quasi.start!)))

      // clear the template string
      tsCodeSegments.push(`\`\` as any as __VLS_VINE.VueVineComponent${vineCompFn.expose
        ? ` & { exposed: (import('vue').ShallowUnwrapRef<typeof __VLS_VINE_ComponentExpose__>) }`
        : ''
      };\n`)
      codegen.currentOffset = vineCompFn.templateStringNode.quasi.end!
    }

    tsCodeSegments.push(...collectSegments(codegen.scriptUntil(vineCompFn.fnDeclNode!.end!)))
    if (vineCompFn.isCustomElement) {
      tsCodeSegments.push(' as CustomElementConstructor);\n')
    }
  }
  tsCodeSegments.push(...collectSegments(codegen.scriptUntil(snapshotContent.length)))

  // Generate all full collection of all used components in this file
  // Only include templateComponentNames that actually exist in bindings,
  // so that truly unknown components are not silently resolved.
  const usedComponents = new Set<string>()
  vineFileCtx.vineCompFns.forEach((vineCompFn) => {
    usedComponents.add(vineCompFn.fnName)
    vineCompFn.templateComponentNames.forEach((compName) => {
      if (compName in vineCompFn.bindings) {
        usedComponents.add(compName)
      }
    })
  })

  tsCodeSegments.push(`\nconst __VLS_VINE_ComponentsReferenceMap = {\n${[...usedComponents].map((compName) => {
    // Check if component name is a valid identifier
    // If not (e.g., 'router-view', 'my-component'), convert to PascalCase
    // TypeScript will resolve it from local definitions or imports
    let componentRef = compName
    if (needsQuotes(compName)) {
      // Convert to PascalCase, which is the standard Vue component naming convention
      // TypeScript will automatically find this identifier whether it's:
      // - Defined locally in this file
      // - Imported from another file
      // - Auto-imported by unplugin-auto-import or similar tools
      componentRef = toPascalCase(compName)
    }
    return `  '${compName}': ${componentRef}`
  }).join(',\n')
  }\n};\n`)

  const tsCode = toString(tsCodeSegments)
  const rawMappings = buildMappings(tsCodeSegments)
  const { mappings: tsCodeMappings, linkedCodeMappings } = postProcessMappings(rawMappings)

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
      ...createTemplateHTMLEmbeddedCodes(vineFileCtx),
      ...createStyleEmbeddedCodes(vineFileCtx),
      ...createSourceVirtualCode(snapshotContent),
    ],
    vineMetaCtx: {
      vineCompileErrs,
      vineCompileWarns,
      vineFileCtx,
    },
  }
}
