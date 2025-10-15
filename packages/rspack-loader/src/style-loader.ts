import type { LoaderContext } from '@rspack/core'
import { compileVineStyle } from '@vue-vine/compiler'
import { getOrCreateGlobalContext } from './context'

export default function vineStyleLoader(
  this: LoaderContext,
  source: string,
): void {
  const callback = this.async()
  const { rootContext, resourcePath, resourceQuery } = this

  // Parse query
  const query = new URLSearchParams(resourceQuery.slice(1))
  const scopeId = query.get('scopeId')!
  const index = Number.parseInt(query.get('index') || '0')
  const lang = query.get('lang') || 'css'
  const scoped = query.has('scoped')
  const isExternal = query.has('external')

  // Detect development mode from loader context
  const isDevelopment = this.mode === 'development'

  const { compilerCtx } = getOrCreateGlobalContext(rootContext, undefined, isDevelopment)

  // Get vineFileId: for external styles, use query param; otherwise use resourcePath
  // Normalize path for cross-platform consistency (Windows uses backslashes)
  const vineFileId = (query.get('vineFileId') || resourcePath).replace(/\\/g, '/')

  let styleSource: string

  if (isExternal) {
    // For external styles, read the source directly
    styleSource = source
  }
  else {
    // For inline styles, get from fileCtx
    const fileCtx = compilerCtx.fileCtxMap.get(vineFileId)

    if (!fileCtx) {
      return callback(new Error(`File context not found for ${vineFileId}`))
    }

    const styleDefine = fileCtx.styleDefine[scopeId]?.[index]

    if (!styleDefine) {
      return callback(new Error(`Style not found: ${scopeId}[${index}]`))
    }

    styleSource = styleDefine.source
  }

  // Compile style
  compileVineStyle(compilerCtx, {
    vineFileId,
    source: styleSource,
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
