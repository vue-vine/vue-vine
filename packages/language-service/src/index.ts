import type {
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
} from '@babel/types'
import type {
  CodeInformation,
  LanguagePlugin,
  Mapping,
  VirtualCode,
  VueCompilerOptions,
} from '@vue/language-core'
import type * as ts from 'typescript'
import type { URI } from 'vscode-uri'
import {
  forEachEmbeddedCode,
} from '@vue/language-core'
import { generateTemplate } from '@vue/language-core/lib/codegen/template'
import {
  type Segment,
  replaceAll,
  toString,
} from 'muggle-string'
import type { VueVineCode } from './shared'
import {
  LINKED_CODE_TAG_PREFIX,
  LINKED_CODE_TAG_SUFFIX,
  createLinkedCodeTag,
  generateVLSContext,
} from './injectTypes'
import { VLS_ErrorLog, getVineTempPropName, turnBackToCRLF } from './shared'
import { createVineFileCtx } from './vine-ctx'

export {
  setupGlobalTypes,
} from './injectTypes'
export {
  isVueVineVirtualCode,
} from './shared'
export type {
  VueVineCode,
} from './shared'

type BabelFunctionNodeTypes = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression

const FULL_FEATURES = {
  completion: true,
  format: true,
  navigation: true,
  semantic: true,
  structure: true,
  verification: true,
} satisfies CodeInformation

interface VineLanguagePluginOptions {
  compilerOptions: ts.CompilerOptions
  vueCompilerOptions: VueCompilerOptions
  target?: 'extension' | 'tsc'
}

export function createVueVineLanguagePlugin(
  ts: typeof import('typescript'),
  options: VineLanguagePluginOptions,
): LanguagePlugin<string | URI> {
  const {
    compilerOptions,
    vueCompilerOptions,
    target = 'extension',
  } = options

  return {
    getLanguageId() {
      return undefined
    },
    createVirtualCode(uriOrFileName, langaugeId, snapshot) {
      const moduleId = String(uriOrFileName)
      if (moduleId.endsWith('.vine.ts') && langaugeId === 'typescript') {
        try {
          const virtualCode = createVueVineCode(
            ts,
            moduleId,
            snapshot,
            compilerOptions,
            vueCompilerOptions,
            target,
          )
          return virtualCode
        }
        catch (err) {
          VLS_ErrorLog(err, 'createVirtualCode')
        }
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

function createVueVineCode(
  ts: typeof import('typescript'),
  sourceFileName: string,
  snapshot: ts.IScriptSnapshot,
  compilerOptions: ts.CompilerOptions,
  vueCompilerOptions: VueCompilerOptions,
  target: 'extension' | 'tsc',
): VueVineCode {
  const content = snapshot.getText(0, snapshot.getLength())

  const {
    vineCompileErrs,
    vineCompileWarns,
    vineFileCtx,
  } = createVineFileCtx(sourceFileName, content)
  const tsCodeSegments: Segment<CodeInformation>[] = []

  tsCodeSegments.push(`/// <reference types=".vue-global-types/vine_${vueCompilerOptions.lib}_${vueCompilerOptions.target}_${vueCompilerOptions.strictTemplates}" />\n\n`)

  let currentOffset = 0

  for (const vineCompFn of vineFileCtx.vineCompFns) {
    if (!vineCompFn.templateStringNode || !vineCompFn.templateReturn) {
      continue
    }

    if (vineCompFn.propsDefinitionBy === 'macro') {
      tsCodeSegments.push(`\ntype __VLS_${vineCompFn.fnName}_props__ = ${vineCompFn.getPropsTypeRecordStr({
        isNeedLinkedCodeTag: true,
        joinStr: ',\n',
      })}\n\n`)
    }

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
      const propsParam = `props: __VLS_${vineCompFn.fnName}_props__`
      tsCodeSegments.push(propsParam)
    }

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

    // We should generate linked code tag as block comment
    // before the variable declared by `vineProp`
    if (vineCompFn.propsDefinitionBy === 'macro') {
      const propVarIdAstNodes = Object.entries(vineCompFn.props).map(([propName, propMeta]) => [propName, propMeta.declaredIdentifier] as const)
      for (let i = 0; i < propVarIdAstNodes.length; i++) {
        const [propName, propVarIdAstNode] = propVarIdAstNodes[i]
        if (!propVarIdAstNode) {
          continue
        }

        generateScriptUntil(propVarIdAstNode.start!)
        tsCodeSegments.push(createLinkedCodeTag('right', propName.length))
      }
    }

    generateScriptUntil(vineCompFn.templateReturn.start!)
    if (isVineCompHasFnBlock) {
      tsCodeSegments.push(...tempVarDecls)
      tsCodeSegments.push('\n\n')
    }

    // Generate the template virtual code
    for (const quasi of vineCompFn.templateStringNode.quasi.quasis) {
      tsCodeSegments.push('\n{\n')

      // Insert all component bindings to __VLS_ctx
      tsCodeSegments.push(
        generateVLSContext(vineCompFn),
      )

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
      tsCodeSegments.push('\n}\n')
    }
    generateScriptUntil(vineCompFn.templateStringNode.quasi.start!)

    // clear the template string
    tsCodeSegments.push('`` as any as VueVineComponent')
    currentOffset = vineCompFn.templateStringNode.quasi.end!
  }
  generateScriptUntil(snapshot.getLength())

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
