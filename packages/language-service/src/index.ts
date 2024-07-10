import {
  forEachEmbeddedCode,
} from '@vue/language-core'
import type {
  CodeInformation,
  LanguagePlugin,
  Mapping,
  VirtualCode,
  VueCompilerOptions,
} from '@vue/language-core'
import { generateTemplate } from '@vue/language-core/lib/codegen/template'
import type * as ts from 'typescript'
import { generateGlobalTypes } from '@vue/language-core/lib/codegen/script/globalTypes'
import {
  type Segment,
  replaceAll,
  toString,
} from 'muggle-string'
import type { URI } from 'vscode-uri'
import type {
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
} from '@babel/types'
import { createVineFileCtx } from './vine-ctx'
import { VLS_ErrorLog, turnBackToCRLF } from './utils'

type BabelFunctionNodeTypes = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression

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
): LanguagePlugin<string | URI> {
  let globalTypesHolder: string | undefined
  return {
    getLanguageId() {
      return undefined
    },
    createVirtualCode(uriOrFileName, langaugeId, snapshot) {
      if (String(uriOrFileName).endsWith('.vine.ts') && langaugeId === 'typescript') {
        globalTypesHolder ??= String(uriOrFileName)
        try {
          const virtualCode = createVueVineCode(ts, String(uriOrFileName), snapshot, compilerOptions, vueCompilerOptions, globalTypesHolder === uriOrFileName)
          return virtualCode
        }
        catch (err) {
          VLS_ErrorLog(err, 'createVirtualCode')
        }
      }
    },
    updateVirtualCode(uriOrFileName, _oldVirtualCode, newSnapshot) {
      try {
        const newSnapshotVineCode = createVueVineCode(ts, String(uriOrFileName), newSnapshot, compilerOptions, vueCompilerOptions, globalTypesHolder === uriOrFileName)
        return newSnapshotVineCode
      }
      catch (err) {
        VLS_ErrorLog(err, 'updateVirtualCode')
        return _oldVirtualCode
      }
    },
    typescript: {
      extraFileExtensions: [],
      getServiceScript(root) {
        for (const code of forEachEmbeddedCode(root)) {
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

    generateScriptUntil(
      getIndexAfterFnDeclLeftParen(
        vineCompFn.fnItselfNode!,
        vineFileCtx.root.tokens ?? [],
      ) + 1, // means generate after '(',
    )
    if (vineCompFn.fnItselfNode?.params.length === 0) {
      // no defined `props` formal parameter,
      // generate a `props` formal parameter in virtual code
      const propsParam = `props: ${vineCompFn.getPropsTypeRecordStr()}`
      tsCodeSegments.push(propsParam)
    }

    generateScriptUntil(vineCompFn.templateReturn.start!)
    for (const quasi of vineCompFn.templateStringNode.quasi.quasis) {
      tsCodeSegments.push('\n{\n')
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
      })

      for (const segment of generatedTemplate) {
        if (typeof segment === 'string') {
          tsCodeSegments.push(segment)
        }
        else if (segment[1] === 'template') {
          // TODO: fix in upstream
          segment[3].structure = false
          segment[3].format = false

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

  // replace typeof __VLS_ctx.foo with import('vue').UnwrapRef<typeof foo>
  replaceAll(tsCodeSegments, /(?<=typeof __VLS_ctx\.\w+\b)/g, '>')
  replaceAll(tsCodeSegments, /(typeof __VLS_ctx\.)/g, `import('vue').UnwrapRef<typeof `)

  // replace __VLS_ctx.foo with (await import('vue').unref(foo))
  replaceAll(tsCodeSegments, /(?<=__VLS_ctx\.\w+\b)/g, ')')
  replaceAll(tsCodeSegments, /(__VLS_ctx\.)/g, `(await import('vue')).unref(`)

  // replace __VLS_components.foo with foo
  replaceAll(tsCodeSegments, /__VLS_components\./g, '')

  if (withGlobalTypes) {
    tsCodeSegments.push(generateGlobalTypes(vueCompilerOptions))
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

  function* createTemplateHTMLEmbeddedCodes(): Generator<VirtualCode> {
    for (const {
      fnName,
      templateSource,
      templateStringNode,
    } of vineFileCtx.vineCompFns) {
      if (!templateStringNode) {
        continue
      }

      const source = vineFileCtx.isCRLF
        ? turnBackToCRLF(templateSource)
        : templateSource

      yield {
        id: `${fnName}_template`.toLowerCase(),
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

function buildMappings<T>(chunks: Segment<T>[]) {
  let length = 0
  const mappings: Mapping<T>[] = []
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

interface BabelToken {
  start: number
  end: number
  type: {
    label: string
  }
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
