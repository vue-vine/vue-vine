import type { LoaderContext } from '@rspack/core'
import type {
  VineCompilerHooks,
  VineCompilerOptions,
} from '@vue-vine/compiler'
import {
  compileVineTypeScriptFile,
  RspackRuntimeAdapter,
} from '@vue-vine/compiler'
import { getOrCreateGlobalContext } from './context'

export interface VineRspackLoaderOptions {
  compilerOptions?: VineCompilerOptions
}

export default function vineRspackLoader(
  this: LoaderContext<VineRspackLoaderOptions>,
  source: string,
): void {
  const callback = this.async()
  const { rootContext, resourcePath, resourceQuery } = this
  const options = this.getOptions()

  // If it's a style virtual module request, let it pass through
  // (will be handled by subsequent rules)
  if (resourceQuery.includes('vine-style')) {
    return callback(null, source)
  }

  // Detect development mode from loader context
  const isDevelopment = this.mode === 'development'

  // Get or create global compiler context
  const globalCtx = getOrCreateGlobalContext(rootContext, options.compilerOptions, isDevelopment)
  const { compilerCtx, tsMorphCache } = globalCtx

  // Configure Rspack adapter
  compilerCtx.options.runtimeAdapter = new RspackRuntimeAdapter()

  // Set up compiler hooks
  const compilerHooks: VineCompilerHooks = {
    getCompilerCtx: () => compilerCtx,
    getTsMorph: () => tsMorphCache,
    onError: err => this.emitError(new Error(err.full)),
    onWarn: warn => this.emitWarning(new Error(warn.full)),
    onBindFileCtx: (fileId, fileCtx) => {
      compilerCtx.fileCtxMap.set(fileId, fileCtx)
    },
    onEnd: () => {
      if (compilerCtx.vineCompileErrors.length > 0) {
        const allErrMsg = compilerCtx.vineCompileErrors
          .map(d => d.full)
          .join('\n')
        compilerCtx.vineCompileErrors.length = 0
        this.emitError(new Error(allErrMsg))
      }
    },
  }

  // Read from cache during HMR
  let fileCtxCache
  if (this.hot && compilerCtx.fileCtxMap.has(resourcePath)) {
    fileCtxCache = compilerCtx.fileCtxMap.get(resourcePath)
    compilerCtx.isRunningHMR = true
  }

  // Compile
  const vineFileCtx = compileVineTypeScriptFile(
    source,
    resourcePath,
    { compilerHooks, fileCtxCache },
    false, // SSR: not supported for now, can be passed via loader options later
  )

  // For HMR: analyze changes and set renderOnly/hmrCompFnsName
  if (this.hot && fileCtxCache) {
    // Simple heuristic: if source code changed, assume it's a template/style change
    // For now, always set renderOnly to true for HMR (optimistic approach)
    // TODO: implement proper patch analysis like Vite plugin's patchModuleOldWay
    vineFileCtx.renderOnly = true
    vineFileCtx.hmrCompFnsName = vineFileCtx.vineCompFns[0]?.fnName || null
  }

  // Add HMR code using runtime adapter
  if (this.hot) {
    const runtimeAdapter = compilerCtx.options.runtimeAdapter
    if (runtimeAdapter) {
      const hmrCode = runtimeAdapter.generateHMRCode({
        fileCtx: vineFileCtx,
        compFnCtx: vineFileCtx.vineCompFns[0], // Not used by Rspack adapter
        isDev: isDevelopment,
      })
      if (hmrCode) {
        vineFileCtx.fileMagicCode.appendRight(
          vineFileCtx.fileMagicCode.length(),
          hmrCode,
        )
      }
    }
  }

  const code = vineFileCtx.fileMagicCode.toString()
  const map = vineFileCtx.fileMagicCode.generateMap({
    includeContent: true,
    hires: true,
    source: resourcePath,
  })

  callback(null, code, map)
}
