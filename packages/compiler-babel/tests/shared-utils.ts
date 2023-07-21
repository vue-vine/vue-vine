import { createCompilerCtx } from '../index'
import type { VineCompilerHooks } from '../src/types'

export function createMockTransformCtx(option = {}) {
  const mockCompilerCtx = createCompilerCtx(option)
  const mockCompilerHooks = {
    onOptionsResolved: cb => cb(mockCompilerCtx.options),
    onError: (err) => { mockCompilerCtx.vineCompileErrors.push(err) },
    onWarn: (warn) => { mockCompilerCtx.vineCompileWarnings.push(warn) },
    onBindFileCtx: (fileId, fileCtx) => mockCompilerCtx.fileCtxMap.set(fileId, fileCtx),
  } as VineCompilerHooks

  return {
    mockCompilerHooks,
    mockCompilerCtx,
  }
}
