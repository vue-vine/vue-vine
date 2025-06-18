import type { LanguagePlugin } from '@volar/language-server'
import type {
  VueCompilerOptions,
} from '@vue/language-core'
import type * as ts from 'typescript'
import type { Track } from './track'
import {
  forEachEmbeddedCode,
} from '@volar/language-core'
import { URI } from 'vscode-uri'
import { VLS_ErrorLog } from './shared'
import { createVueVineVirtualCode } from './virtual-code'

export type {
  PipelineRequest,
  PipelineRequestInstance,
  PipelineResponse,
  PipelineResponseInstance,
} from '../typescript-plugin/types'
export {
  pipelineRequest,
  tryParsePipelineResponse,
} from '../typescript-plugin/utils'

export {
  setupGlobalTypes,
} from './injectTypes'
export {
  isVueVineVirtualCode,
  VLS_ErrorLog,
  vlsInfoLog,
} from './shared'
export type {
  VueVineVirtualCode,
} from './shared'

export {
  getLogTimeLabel,
  Track,
} from './track'
export type {
  TrackOutputChannel,
} from './track'

export {
  createVueVineVirtualCode,
} from './virtual-code'

interface VineLanguagePluginOptions {
  compilerOptions: ts.CompilerOptions
  vueCompilerOptions: VueCompilerOptions
  target?: 'extension' | 'tsc'
  track?: Track
}

export function createVueVineLanguagePlugin(
  ts: typeof import('typescript'),
  options: VineLanguagePluginOptions,
): LanguagePlugin<string | URI> {
  const {
    compilerOptions,
    vueCompilerOptions,
    track,
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
          const virtualCode = createVueVineVirtualCode(
            ts,
            moduleId,
            snapshotContent,
            compilerOptions,
            vueCompilerOptions,
            target,
          )
          track?.trackEvent('virtual_code_created')
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
