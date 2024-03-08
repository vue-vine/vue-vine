import type {
  CodeInformation,
  LanguagePlugin,
  VirtualCode,
} from '@volar/language-core'
import {
  forEachEmbeddedCode,
} from '@volar/language-core'
import type * as ts from 'typescript'
import { createVineFileCtx } from './vine-ctx'
import { turnBackToCRLF } from 'src/utils'

export interface VueVineCode extends VirtualCode {}

const FULL_FEATURES = {
  completion: true,
  format: true,
  navigation: true,
  semantic: true,
  structure: true,
  verification: true,
} satisfies CodeInformation

export function createVueVineLanguagePlugin(ts: typeof import('typescript')): LanguagePlugin {
  return {
    createVirtualCode(id, langaugeId, snapshot) {
      if (id.endsWith('.vine.ts') && langaugeId === 'typescript') {
        return createVueVineCode(ts, id, snapshot)
      }
    },
    updateVirtualCode(id, _oldVirtualCode, newSnapshot) {
      return createVueVineCode(ts, id, newSnapshot)
    },
    typescript: {
      extraFileExtensions: [],
      getScript(rootVirtualCode) {
        for (const code of forEachEmbeddedCode(rootVirtualCode)) {
          if (code.id === 'script') {
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
): VueVineCode {
  const content = snapshot.getText(0, snapshot.getLength())

  const vineFileCtx = createVineFileCtx(sourceFileName, content)

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

  function* createTemplateEmbeddedCodes(): Generator<VirtualCode> {
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

  return {
    id: 'root',
    languageId: 'typescript',
    snapshot,
    mappings: [
      {
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [snapshot.getLength()],
        data: {
          completion: true,
          format: true,
          navigation: true,
          semantic: true,
          structure: true,
          verification: true,
        },
      },
    ],
    embeddedCodes: [
      ...createTemplateEmbeddedCodes(),
      ...createStyleEmbeddedCodes(),
    ],
  }
}
