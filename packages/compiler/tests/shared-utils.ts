import { createCompilerCtx } from '../src/index'
import type { VineCompilerHooks, VineCompilerOptions } from '../src/types'

export function createMockTransformCtx(option: VineCompilerOptions = {}) {
  const mockCompilerCtx = createCompilerCtx(option)
  const mockCompilerHooks = {
    getCompilerCtx: () => mockCompilerCtx,
    onError: (err) => { mockCompilerCtx.vineCompileErrors.push(err) },
    onWarn: (warn) => { mockCompilerCtx.vineCompileWarnings.push(warn) },
    onBindFileCtx: (fileId, fileCtx) => mockCompilerCtx.fileCtxMap.set(fileId, fileCtx),
  } as VineCompilerHooks

  return {
    mockCompilerHooks,
    mockCompilerCtx,
  }
}
