import {
  type CodeInformation,
  type LanguagePlugin,
  type Segment,
  type VirtualCode,
  type VueCompilerOptions,
  buildMappings,
  forEachEmbeddedCode,
  replaceAll,
  toString,
} from '@vue/language-core'
import { generate as generateTemplate } from '@vue/language-core/lib/generators/template'
import type * as ts from 'typescript'
import { turnBackToCRLF } from '../utils'
import { generateGlobalHelperTypes } from './globalTypes'
import { createVineFileCtx } from './vine-ctx'

export interface VueVineCode extends VirtualCode { }

const FULL_FEATURES = {
  completion: true,
  format: true,
  navigation: true,
  semantic: true,
  structure: true,
  verification: true,
} satisfies CodeInformation

export function createVueVineLanguagePlugin(
  ts: typeof import('typescript'),
  compilerOptions: ts.CompilerOptions,
  vueCompilerOptions: VueCompilerOptions,
): LanguagePlugin {
  let globalTypesHolder: string | undefined
  return {
    createVirtualCode(id, langaugeId, snapshot) {
      if (id.endsWith('.vine.ts') && langaugeId === 'typescript') {
        globalTypesHolder ??= id
        return createVueVineCode(ts, id, snapshot, compilerOptions, vueCompilerOptions, globalTypesHolder === id)
      }
    },
    updateVirtualCode(id, _oldVirtualCode, newSnapshot) {
      return createVueVineCode(ts, id, newSnapshot, compilerOptions, vueCompilerOptions, globalTypesHolder === id)
    },
    typescript: {
      extraFileExtensions: [],
      getScript(rootVirtualCode) {
        for (const code of forEachEmbeddedCode(rootVirtualCode)) {
          if (code.id === 'root') {
            return {
              code,
              extension: '.ts',
              scriptKind: 3,
            }
          }
        }
      },
    },
  }
}

function createVueVineCode(
  ts: typeof import('typescript'),
  sourceFileName: string,
  snapshot: ts.IScriptSnapshot,
  compilerOptions: ts.CompilerOptions,
  vueCompilerOptions: VueCompilerOptions,
  withGlobalTypes: boolean,
): VueVineCode {
  const content = snapshot.getText(0, snapshot.getLength())

  const vineFileCtx = createVineFileCtx(sourceFileName, content)
  const tsCodeSegments: Segment<CodeInformation>[] = []

  let currentOffset = 0

  for (const vineCompFn of vineFileCtx.vineCompFns) {
    if (!vineCompFn.templateStringNode || !vineCompFn.templateReturn) {
      continue
    }
    generateScriptUntil(vineCompFn.templateReturn.start!)
    for (const quasi of vineCompFn.templateStringNode.quasi.quasis) {
      tsCodeSegments.push('\n{\n')
      for (const [type, segment] of generateTemplate(
        ts,
        compilerOptions,
        vueCompilerOptions,
        {
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
        false,
        new Set(),
        false,
        undefined,
        undefined,
        false,
      )) {
        if (type !== 'ts') {
          continue
        }
        if (typeof segment === 'string') {
          tsCodeSegments.push(segment)
        }
        else if (segment[1] === 'template') {
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
      tsCodeSegments.push('\n}\n')
    }
    generateScriptUntil(vineCompFn.templateStringNode.quasi.start!)

    // clear the template string
    tsCodeSegments.push('``')
    currentOffset = vineCompFn.templateStringNode.quasi.end!
  }
  generateScriptUntil(snapshot.getLength())

  // replace typeof __VLS_ctx.foo with import('vue').UnwrapRef(typeof foo)
  replaceAll(tsCodeSegments, /(?<=typeof __VLS_ctx\.\w+\b)/g, '>')
  replaceAll(tsCodeSegments, /(typeof __VLS_ctx\.)/g, `import('vue').UnwrapRef<typeof `)

  // replace __VLS_ctx.foo with (await import('vue').unref(foo))
  replaceAll(tsCodeSegments, /(?<=__VLS_ctx\.\w+\b)/g, ')')
  replaceAll(tsCodeSegments, /(__VLS_ctx\.)/g, `(await import('vue')).unref(`)

  // replace __VLS_components.foo with foo
  replaceAll(tsCodeSegments, /__VLS_components\./g, '')

  if (withGlobalTypes) {
    tsCodeSegments.push(generateGlobalHelperTypes(vueCompilerOptions))
  }

  const tsCode = toString(tsCodeSegments)
  const tsCodeMappings = buildMappings(tsCodeSegments)

  return {
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
    embeddedCodes: [
      ...createTemplateHTMLEmbeddedCodes(),
      ...createStyleEmbeddedCodes(),
    ],
  }

  function generateScriptUntil(targetOffset: number) {
    tsCodeSegments.push([
      snapshot.getText(currentOffset, targetOffset),
      undefined,
      currentOffset,
      FULL_FEATURES,
    ])
    currentOffset = targetOffset
  }

  function* createStyleEmbeddedCodes(): Generator<VirtualCode> {
    for (const { lang, source: bableParsedSource, range, compCtx } of Object.values(
      vineFileCtx.styleDefine,
    )) {
      if (!range) {
        return
      }

      // String content parsed by @babel/parser would always be LF,
      // But for Volar location mapping we need to turn it back to CRLF.
      const source = vineFileCtx.isCRLF
        ? turnBackToCRLF(bableParsedSource)
        : bableParsedSource

      yield {
        id: `${compCtx.fnName}_style_${lang}`,
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

  function* createTemplateHTMLEmbeddedCodes(): Generator<VirtualCode> {
    for (const {
      fnName,
      templateSource,
      templateStringNode,
    } of vineFileCtx.vineCompFns) {
      const source = vineFileCtx.isCRLF
        ? turnBackToCRLF(templateSource)
        : templateSource

      yield {
        id: `${fnName}_template`,
        languageId: 'html',
        snapshot: {
          getText: (start, end) => source.slice(start, end),
          getLength: () => source.length,
          getChangeRange: () => undefined,
        },
        mappings: [
          {
            sourceOffsets: [templateStringNode!.quasi.quasis[0].start!],
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
