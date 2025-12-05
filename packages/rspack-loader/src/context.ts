import type { VineCompilerOptions } from '@vue-vine/compiler'
import { createCompilerCtx, createTsMorph, LYNX_BUILTIN_COMPONENTS } from '@vue-vine/compiler'

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

  const compilerOptions = {
    envMode: isDevelopment ? 'development' : 'production',
    inlineTemplate: !isDevelopment,
    ...userOptions,
  }

  if (compilerOptions.lynx?.enabled) {
    compilerOptions.vueCompilerOptions ??= {}
    const originalIsCustomElement = compilerOptions.vueCompilerOptions.isCustomElement
    compilerOptions.vueCompilerOptions.isCustomElement = (tag: string) => {
      return originalIsCustomElement?.(tag) || LYNX_BUILTIN_COMPONENTS.includes(tag)
    }
  }

  const compilerCtx = createCompilerCtx(compilerOptions)

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
