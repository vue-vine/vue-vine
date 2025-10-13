import type { LoaderContext } from '@rspack/core'
import { compileVineStyle } from '@vue-vine/compiler'
import { getOrCreateGlobalContext } from './context'

export default function vineStyleLoader(
  this: LoaderContext,
  _source: string,
): void {
  const callback = this.async()
  const { rootContext, resourcePath, resourceQuery } = this

  // Parse query
  const query = new URLSearchParams(resourceQuery.slice(1))
  const scopeId = query.get('scopeId')!
  const index = Number.parseInt(query.get('index') || '0')
  const lang = query.get('lang') || 'css'
  const scoped = query.has('scoped')

  // Detect development mode from loader context
  const isDevelopment = this.mode === 'development'

  const { compilerCtx } = getOrCreateGlobalContext(rootContext, undefined, isDevelopment)

  // Get style definition from fileCtxMap
  const vineFileId = resourcePath
  const fileCtx = compilerCtx.fileCtxMap.get(vineFileId)

  if (!fileCtx) {
    return callback(new Error(`File context not found for ${vineFileId}`))
  }

  const styleDefine = fileCtx.styleDefine[scopeId]?.[index]

  if (!styleDefine) {
    return callback(new Error(`Style not found: ${scopeId}[${index}]`))
  }

  // Compile style
  compileVineStyle(compilerCtx, {
    vineFileId,
    source: styleDefine.source,
    isScoped: scoped,
    scopeId,
    preprocessLang: lang as any,
  })
    .then(({ code, map }) => {
      // Type assertion needed: source-map-js RawSourceMap.version is string,
      // but Rspack expects number. They are compatible at runtime.
      callback(null, code, map as any)
    })
    .catch(err => callback(err))
}
