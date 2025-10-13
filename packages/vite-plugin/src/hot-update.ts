// HMR implementation
// HMR code generation is now handled by RuntimeAdapter
export { getHMRManagerInstance, VineHMRManager } from './hmr'

// Legacy compatibility - redirect to new implementation
export async function vineHMR(
  ctx: import('vite').HmrContext,
  compilerCtx: import('@vue-vine/compiler').VineCompilerCtx,
  compilerHooks: import('@vue-vine/compiler').VineCompilerHooks,
): Promise<import('vite').ModuleNode[] | undefined> {
  const { getHMRManagerInstance } = await import('./hmr')
  const hmrManager = getHMRManagerInstance()
  return hmrManager.handleHMR(ctx, compilerCtx, compilerHooks)
}
