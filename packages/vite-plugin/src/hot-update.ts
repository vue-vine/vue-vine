// New HMR implementation
// Keep the existing addHMRHelperCode function for compatibility
import type { VineFileCtx } from '@vue-vine/compiler'

export { getHMRManagerInstance, VineHMRManager } from './hmr'
export function addHMRHelperCode(vineFileCtx: VineFileCtx): void {
  const ms = vineFileCtx.fileMagicCode
  ms.appendRight(
    ms.length(),
    `export const _rerender_only = ${vineFileCtx.renderOnly}
export const _rerender_vcf_fn_name = "${vineFileCtx.hmrCompFnsName ?? ''}"
if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (!mod) { return; }
    const { _rerender_only, _rerender_vcf_fn_name } = mod;
    if (!_rerender_vcf_fn_name) { return; }
    const component = mod[_rerender_vcf_fn_name];
    if (_rerender_only) {
      __VUE_HMR_RUNTIME__.rerender(component.__hmrId, component.render);
    } else {
      __VUE_HMR_RUNTIME__.reload(component.__hmrId, component);
    }
  });
}`,
  )
}

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
