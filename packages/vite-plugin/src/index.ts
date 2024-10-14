import process from 'node:process'
import type { HmrContext, Plugin, TransformResult } from 'vite'
import { createLogger } from 'vite'
import type { VineCompilerHooks, VineCompilerOptions, VineFileCtx, VineProcessorLang } from '@vue-vine/compiler'
import { compileVineStyle, compileVineTypeScriptFile, createCompilerCtx } from '@vue-vine/compiler'
import type { TransformPluginContext } from 'rollup'
import type { VineQuery } from './parse-query'
import { parseQuery } from './parse-query'
import { vineHMR } from './hot-update'
import { QUERY_TYPE_STYLE } from './constants'
import { hmrImportCss, saveImportCssFile } from './import-css'

function createVinePlugin(options: VineCompilerOptions = {}): Plugin {
  const watchedFiles = new Map()
  const compilerCtx = createCompilerCtx({
    ...options,
    envMode: options.envMode ?? (process.env.NODE_ENV || 'development'),
    inlineTemplate: options.inlineTemplate ?? process.env.NODE_ENV === 'production',
  })

  const panicOnCompilerError = (pluginContext: TransformPluginContext) => {
    if (compilerCtx.vineCompileErrors.length > 0) {
      const allErrMsg = compilerCtx.vineCompileErrors
        .map(diagnositc => diagnositc.full)
        .join('\n')
      compilerCtx.vineCompileErrors.length = 0
      pluginContext.error(new Error(
        `Vue Vine compilation failed:\n${allErrMsg}`,
      ))
    }
  }

  let transformPluginContext: TransformPluginContext

  const compilerHooks: VineCompilerHooks = {
    getCompilerCtx: () => compilerCtx,
    onError: errMsg => compilerCtx.vineCompileErrors.push(errMsg),
    onWarn: warnMsg => compilerCtx.vineCompileWarnings.push(warnMsg),
    onBindFileCtx: (fileId, fileCtx) => compilerCtx.fileCtxMap.set(fileId, fileCtx),
    onEnd: () => panicOnCompilerError(transformPluginContext),
  }

  const runCompileScript = (code: string, fileId: string, ssr: boolean): Partial<TransformResult> => {
    let fileCtxMap: undefined | VineFileCtx
    if (compilerCtx.isRunningHMR) {
      fileCtxMap = compilerCtx.fileCtxMap.get(fileId)
    }
    const vineFileCtx = compileVineTypeScriptFile(
      code,
      fileId,
      {
        compilerHooks,
        fileCtxCache: fileCtxMap,
      },
      ssr,
    )

    // Print all warnings
    const warnLogger = createLogger('warn')
    if (compilerCtx.vineCompileWarnings.length > 0) {
      for (const warn of compilerCtx.vineCompileWarnings) {
        warnLogger.warn(warn.full)
      }
    }
    compilerCtx.vineCompileWarnings.length = 0

    return {
      code: vineFileCtx.fileMagicCode.toString(),
      map: vineFileCtx.fileMagicCode.generateMap({
        includeContent: true,
        hires: true,
        source: fileId,
      }),
    }
  }
  const runCompileStyle = async (
    styleSource: string,
    query: VineQuery,
    vineFileId: string,
  ) => {
    const { code: compiled } = await compileVineStyle(
      compilerCtx,
      {
        vineFileId,
        source: styleSource,
        isScoped: query.scoped,
        scopeId: query.scopeId,
        preprocessLang: query.lang as VineProcessorLang,
      },
    )
    return compiled
  }

  return {
    name: 'vue-vine-plugin',
    enforce: 'pre',
    async resolveId(id) {
      const { query } = parseQuery(id)
      if (query.type === QUERY_TYPE_STYLE) {
        // serve vine style requests as virtual modules
        return id
      }
    },
    async load(id) {
      const { fileId, query } = parseQuery(id)
      if (query.type === QUERY_TYPE_STYLE && query.scopeId) {
        const fullFileId = `${fileId}.vine.ts`
        let styleSource = compilerCtx.fileCtxMap
          .get(fullFileId)?.styleDefine[query.scopeId][query.index]
          .source ?? ''
        if (query.importTag && styleSource.endsWith('.css')) {
          const styleData = saveImportCssFile(fileId, styleSource, compilerCtx, fullFileId)
          styleSource = styleData.styleSource
          if (!watchedFiles.has(styleData.stylePath)) {
            watchedFiles.set(styleData.stylePath, id)
          }
        }
        const compiledStyle = await runCompileStyle(
          styleSource,
          query,
          `${fileId /* This is virtual file id */}.vine.ts`,
        )
        return compiledStyle
      }
    },
    async transform(code, id, opt) {
      const ssr = opt?.ssr === true
      const { fileId, query } = parseQuery(id)
      if (!fileId.endsWith('.vine.ts') || query.type === QUERY_TYPE_STYLE) {
        return
      }

      // eslint-disable-next-line ts/no-this-alias
      transformPluginContext = this

      return runCompileScript(code, id, ssr)
    },
    async handleHotUpdate(ctx: HmrContext) {
      const { file } = ctx
      let result = null
      if (file.endsWith('.css') && watchedFiles.has(file)) {
        const { prevImportStyleCode, styleFileQuery } = await hmrImportCss(ctx, file, compilerCtx, watchedFiles)
        result = await vineHMR(ctx, compilerCtx, compilerHooks, prevImportStyleCode, styleFileQuery)
        compilerCtx.fileCtxMap.get(file)!.importStyleOriginCode = result!.newImportStyleCode

        // 过滤为外部css模块
        const hmrResult = result?.affectedModules.filter((m) => {
          return Array.from(watchedFiles.values()).includes(m.id!)
        })
        return hmrResult
      }
      else {
        result = await vineHMR(ctx, compilerCtx, compilerHooks)
        return result?.affectedModules
      }
    },

  }
}

export {
  createVinePlugin as vinePlugin,
}
