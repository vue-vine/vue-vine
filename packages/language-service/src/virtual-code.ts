import type { BlockStatement } from '@babel/types'
import type { VineFileCtx } from '@vue-vine/compiler'
import type { Mapping, VueCompilerOptions } from '@vue/language-core'
import type { Segment } from 'muggle-string'
import type ts from 'typescript'
import type { CodeSegment, VineCodeInformation, VineCompFn, VueVineVirtualCode } from './shared'
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

interface TemplateVirtualCodeContext {
  ts: typeof import('typescript')
  vueCompilerOptions: VueCompilerOptions
  vineCompFn: VineCompFn
  vineFileCtx: VineFileCtx
  codegen: CodeGenerator
  excludeBindings: Set<string>
}

function generateTemplateVirtualCode(
  ctx: TemplateVirtualCodeContext,
): CodeSegment[] {
  const { ts, vueCompilerOptions, vineCompFn, vineFileCtx, codegen, excludeBindings } = ctx
  const segments: CodeSegment[] = []

  for (const quasi of vineCompFn.templateStringNode!.quasi.quasis) {
    segments.push('\n// --- Start: Template virtual code\n')

    // Insert all component bindings to __VLS_ctx
    segments.push(...collectSegments(generateVLSContext(vineCompFn, {
      excludeBindings,
    })))

    // Insert `__VLS_StyleScopedClasses`
    segments.push(...collectSegments(codegen.styleScopedClasses()))

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

    // For custom element tags, generate PascalCase variable aliases
    // and add to setupConsts so template codegen produces navigation-enabled segments.
    // Use __linkedToken to link the alias back to the original component function name.
    const ceRegistrations = vineFileCtx.customElementRegistrations
    for (const tagName of vineCompFn.templateComponentNames) {
      const componentFnName = ceRegistrations.get(tagName)
      if (componentFnName) {
        const pascalName = toPascalCase(tagName)
        setupConsts.add(pascalName)
        const token = Symbol(pascalName.length.toString())
        segments.push('const ')
        segments.push(['', undefined, 0, { __linkedToken: token }])
        segments.push(`${pascalName} = `)
        segments.push(['', undefined, 0, { __linkedToken: token }])
        segments.push(`${componentFnName};\n`)
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
        start: vineCompFn.templateStringNode!.start!,
        end: vineCompFn.templateStringNode!.end!,
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
        segments.push(segment)
      }
      else if (segment[1] === 'template') {
        segments.push([
          segment[0],
          undefined,
          segment[2] + quasi.start!,
          segment[3],
        ])
      }
      else {
        segments.push(segment[0])
      }
    }
    segments.push('\n// --- End: Template virtual code\n\n')
  }

  return segments
}

function generateComponentVirtualCode(
  ctx: TemplateVirtualCodeContext,
): CodeSegment[] {
  const { vineCompFn, codegen } = ctx
  const segments: CodeSegment[] = []

  const excludeBindings = new Set<string>()
  const tempVarDecls: string[] = []

  // Write out the component function's formal parameters
  segments.push(...collectSegments(codegen.componentPropsAndContext(vineCompFn)))

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

    segments.push(...collectSegments(codegen.scriptUntil(blockStartPos)))
    segments.push(...collectSegments(codegen.prefixVirtualCode(vineCompFn)))

    // Generate function body statements
    segments.push(...collectSegments(codegen.virtualCodeByAstPositionSorted(vineCompFn, {
      excludeBindings,
    })))

    // after all statements in the function body
    segments.push(...collectSegments(codegen.scriptUntil(vineCompFn.templateReturn!.start!)))
    if (tempVarDecls.length > 0) {
      segments.push(...tempVarDecls)
      segments.push('\n\n')
    }

    // Generate the template virtual code
    segments.push(...generateTemplateVirtualCode({ ...ctx, excludeBindings }))

    segments.push(...collectSegments(codegen.scriptUntil(vineCompFn.templateStringNode!.quasi.start!)))

    // clear the template string
    segments.push(`\`\` as any as __VLS_VINE.VueVineComponent${vineCompFn.expose
      ? ` & { exposed: (import('vue').ShallowUnwrapRef<typeof __VLS_VINE_ComponentExpose__>) }`
      : ''
    };\n`)
    codegen.currentOffset = vineCompFn.templateStringNode!.quasi.end!
  }

  segments.push(...collectSegments(codegen.scriptUntil(vineCompFn.fnDeclNode!.end!)))
  if (vineCompFn.isCustomElement) {
    segments.push(');\n')
  }

  return segments
}

function generateComponentsReferenceMap(vineFileCtx: VineFileCtx): string {
  const usedComponents = new Set<string>()
  vineFileCtx.vineCompFns.forEach((vineCompFn) => {
    usedComponents.add(vineCompFn.fnName)
    vineCompFn.templateComponentNames.forEach((compName) => {
      if (compName in vineCompFn.bindings) {
        usedComponents.add(compName)
      }
    })
  })

  return `\nconst __VLS_VINE_ComponentsReferenceMap = {\n${[...usedComponents].map((compName) => {
    let componentRef = compName
    if (needsQuotes(compName)) {
      componentRef = toPascalCase(compName)
    }
    return `  '${compName}': ${componentRef}`
  }).join(',\n')
  }\n};\n`
}

export function createVueVineVirtualCode(
  ts: typeof import('typescript'),
  fileId: string,
  snapshotContent: string,
  tsCompilerOptions: ts.CompilerOptions,
  vueCompilerOptions: VueCompilerOptions,
  _target: 'extension' | 'tsc',
): VueVineVirtualCode {
  const {
    vineCompileErrs,
    vineCompileWarns,
    vineFileCtx,
  } = analyzeVineForVirtualCode(fileId, snapshotContent)

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
    tsCodeSegments.push(...generateComponentVirtualCode({
      ts,
      vueCompilerOptions,
      vineCompFn,
      vineFileCtx,
      codegen,
      excludeBindings: new Set(),
    }))
  }
  tsCodeSegments.push(...collectSegments(codegen.scriptUntil(snapshotContent.length)))

  tsCodeSegments.push(generateComponentsReferenceMap(vineFileCtx))

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
