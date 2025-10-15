import type { LoaderContext } from '@rspack/core'
import type {
  VineCompilerHooks,
  VineCompilerOptions,
} from '@vue-vine/compiler'
import {
  analyzeHMRPatch,
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

  // Normalize path for cross-platform consistency (Windows uses backslashes)
  const normalizedPath = resourcePath.replace(/\\/g, '/')

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
  }

  // Read from cache during HMR
  let fileCtxCache
  if (this.hot && compilerCtx.fileCtxMap.has(normalizedPath)) {
    fileCtxCache = compilerCtx.fileCtxMap.get(normalizedPath)
    compilerCtx.isRunningHMR = true
  }

  // Compile
  const vineFileCtx = compileVineTypeScriptFile(
    source,
    normalizedPath,
    { compilerHooks, fileCtxCache },
    false, // SSR: not supported for now, can be passed via loader options later
  )

  // For HMR: analyze changes and set renderOnly/hmrCompFnsName
  if (this.hot && fileCtxCache) {
    const hmrPatchResult = analyzeHMRPatch(fileCtxCache, vineFileCtx)
    vineFileCtx.renderOnly = hmrPatchResult.renderOnly
    vineFileCtx.hmrCompFnsName = hmrPatchResult.hmrCompFnsName
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
    source: normalizedPath,
  })

  callback(null, code, map)
}
