import type {
  LanguagePlugin,
  VueCompilerOptions,
} from '@vue/language-core'
import type * as ts from 'typescript'
import {
  forEachEmbeddedCode,
} from '@vue/language-core'
import { URI } from 'vscode-uri'
import { VLS_ErrorLog } from './shared'
import { createVueVineCode } from './virtual-code'

export {
  setupGlobalTypes,
} from './injectTypes'
export {
  isVueVineVirtualCode,
  VLS_ErrorLog,
  vlsInfoLog,
} from './shared'
export type {
  VueVineCode,
} from './shared'
export {
  createVueVineCode,
} from './virtual-code'

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

  let vineActiveModuleId: string | undefined

  return {
    getLanguageId() {
      return undefined
    },
    createVirtualCode(uriOrFileName, langaugeId, snapshot) {
      const moduleId = (
        URI.isUri(uriOrFileName)
          ? uriOrFileName.fsPath.replace(/\\/g, '/') // Maybe a windows path
          : uriOrFileName // Must be a posix path
      )
      if (
        moduleId.endsWith('.vine.ts')
        && !moduleId.includes('volar_virtual_code')
        && langaugeId === 'typescript'
      ) {
        if (vineActiveModuleId !== moduleId) {
          vineActiveModuleId = moduleId
        }

        try {
          const snapshotContent = snapshot.getText(0, snapshot.getLength())
          const virtualCode = createVueVineCode(
            ts,
            moduleId,
            snapshotContent,
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
              scriptKind: ts.ScriptKind.TS,
            }
          }
        }
      },
    },
  }
}
