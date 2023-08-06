import type { RawSourceMap } from 'source-map-js'
import type { VineCompilerCtx, VineFileCtx } from '../types'

export type StyleCompileCtx = [
  compilerCtx: VineCompilerCtx,
  fileCtx: VineFileCtx,
]

export type StylePreprocessor = (
  source: string,
  map: RawSourceMap | undefined,
  options: Record<string, any>,
  load?: (id: string) => any
) => StylePreprocessorResults

export interface StylePreprocessorResults {
  code: string
  map?: object
  errors: Error[]
  dependencies: string[]
}
