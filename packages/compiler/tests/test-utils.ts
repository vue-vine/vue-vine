import type { VineCompilerHooks, VineCompilerOptions } from '../src/types'
import { createCompilerCtx, createTsMorph } from '../src/index'

export function createMockTransformCtx(option: VineCompilerOptions = {}) {
  const mockCompilerCtx = createCompilerCtx(option)
  const mockCompilerHooks = {
    getCompilerCtx: () => mockCompilerCtx,
    getTsMorph: () => createTsMorph(),
    onError: (err) => { mockCompilerCtx.vineCompileErrors.push(err) },
    onWarn: (warn) => { mockCompilerCtx.vineCompileWarnings.push(warn) },
    onBindFileCtx: (fileId, fileCtx) => mockCompilerCtx.fileCtxMap.set(fileId, fileCtx),
  } as VineCompilerHooks

  return {
    mockCompilerHooks,
    mockCompilerCtx,
  }
}
