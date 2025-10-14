import type { VineCompilerOptions } from '@vue-vine/compiler'
import { createCompilerCtx, createTsMorph } from '@vue-vine/compiler'

interface GlobalContext {
  compilerCtx: ReturnType<typeof createCompilerCtx>
  tsMorphCache: ReturnType<typeof createTsMorph>
}

const globalContextMap = new Map<string, GlobalContext>()

export function getOrCreateGlobalContext(
  rootContext: string,
  userOptions?: VineCompilerOptions,
  isDevelopment = true,
): GlobalContext {
  const cacheKey = `${rootContext}_${isDevelopment ? 'dev' : 'prod'}`

  if (globalContextMap.has(cacheKey)) {
    return globalContextMap.get(cacheKey)!
  }

  const compilerCtx = createCompilerCtx({
    envMode: isDevelopment ? 'development' : 'production',
    inlineTemplate: !isDevelopment,
    ...userOptions,
  })

  // Create ts-morph instance
  const tsConfigPath = compilerCtx.options.tsMorphOptions?.tsConfigPath
  const tsMorphCache = createTsMorph({
    fileId: rootContext,
    tsConfigPath,
  })

  const ctx: GlobalContext = {
    compilerCtx,
    tsMorphCache,
  }

  globalContextMap.set(cacheKey, ctx)
  return ctx
}
