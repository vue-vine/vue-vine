import type {
  VineCompilerHooks,
  VineCompilerOptions,
  VineFileCtx,
  VineProcessorLang,
  VineQuery,
} from '@vue-vine/compiler'
import type { TransformPluginContext } from 'rollup'
import type { HmrContext, PluginOption, TransformResult } from 'vite'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import {
  compileVineStyle,
  compileVineTypeScriptFile,
  createCompilerCtx,
  createTsMorph,
} from '@vue-vine/compiler'
import { createLogger, transformWithEsbuild } from 'vite'
import { QUERY_TYPE_STYLE, QUERY_TYPE_STYLE_EXTERNAL } from './constants'
import { addHMRHelperCode, vineHMR } from './hot-update'
import { parseQuery } from './parse-query'

type TsMorphCache = ReturnType<Required<VineCompilerHooks>['getTsMorph']>

function createVinePlugin(options: VineCompilerOptions = {}): PluginOption {
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
      pluginContext.error(`Vue Vine compilation failed:\n${allErrMsg}`)
    }
  }

  let transformPluginContext: TransformPluginContext
  let tsMorphCache: TsMorphCache

  const compilerHooks: VineCompilerHooks = {
    getCompilerCtx: () => compilerCtx,
    getTsMorph: () => tsMorphCache,
    onError: errMsg => compilerCtx.vineCompileErrors.push(errMsg),
    onWarn: warnMsg => compilerCtx.vineCompileWarnings.push(warnMsg),
    onBindFileCtx: (fileId, fileCtx) => compilerCtx.fileCtxMap.set(fileId, fileCtx),
    onEnd: () => panicOnCompilerError(transformPluginContext),
  }

  const runCompileScript = async (code: string, fileId: string, ssr: boolean): Promise<Partial<TransformResult>> => {
    let fileCtxCache: undefined | VineFileCtx
    if (compilerCtx.isRunningHMR) {
      fileCtxCache = compilerCtx.fileCtxMap.get(fileId)
    }
    const vineFileCtx = compileVineTypeScriptFile(
      code,
      fileId,
      {
        compilerHooks,
        fileCtxCache,
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

    // Inject `import.meta.hot.accept`
    addHMRHelperCode(vineFileCtx)

    // Since we skipped using vite:esbuild built-in plugin to transform .vine.ts files,
    // we need to transform them manually here.
    const { code: compiledCode, map } = await transformWithEsbuild(
      vineFileCtx.fileMagicCode.toString(),
      fileId,
      {
        loader: 'ts',
        target: 'esnext',
      },
      vineFileCtx.fileMagicCode.generateMap({
        includeContent: true,
        hires: true,
        source: fileId,
      }),
    )

    return {
      code: compiledCode,
      map,
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
    name: 'vite:vue-vine',
    config(config) {
      if (!config.esbuild) {
        config.esbuild = {}
      }

      // Exclude vine files from esbuild
      config.esbuild.exclude = [
        ...(
          config.esbuild.exclude
            ? (
                Array.isArray(config.esbuild.exclude)
                  ? config.esbuild.exclude
                  : [config.esbuild.exclude]
              )
            : []
        ),
        /\.vine\.ts$/,
      ]

      return config
    },
    async resolveId(id) {
      const { query } = parseQuery(id)

      // serve vine style requests as virtual modules
      if (
        query.type === QUERY_TYPE_STYLE
        || query.type === QUERY_TYPE_STYLE_EXTERNAL
      ) {
        return id
      }
    },
    async load(id) {
      const { filePath, query } = parseQuery(id)
      if (query.type === QUERY_TYPE_STYLE && query.scopeId) {
        const fullFileId = `${filePath}.vine.ts`
        const styleSource = compilerCtx.fileCtxMap
          .get(fullFileId)
          ?.styleDefine
          ?.[query.scopeId]
          ?.[query.index]
          ?.source ?? ''
        const compiledStyle = await runCompileStyle(
          styleSource,
          query,
          `${filePath}.vine.ts`,
        )
        return compiledStyle
      }
      else if (
        query.type === QUERY_TYPE_STYLE_EXTERNAL
        && query.scopeId
        && query.vineFileId
      ) {
        const styleSource = await readFile(filePath, 'utf-8')
        const compiledStyle = await runCompileStyle(
          styleSource,
          query,
          query.vineFileId,
        )

        return compiledStyle
      }
    },
    async transform(code, id, opt) {
      const ssr = opt?.ssr === true
      const { filePath, query } = parseQuery(id)
      if (
        !filePath.endsWith('.vine.ts')
        || query.type === QUERY_TYPE_STYLE
      ) {
        return
      }

      // eslint-disable-next-line ts/no-this-alias
      transformPluginContext = this

      if (!tsMorphCache) {
        tsMorphCache = createTsMorph(id)
      }

      return runCompileScript(code, id, ssr)
    },
    async handleHotUpdate(ctx: HmrContext) {
      // Before executing HMR, TypeScript project (by ts-morph) should be updated
      // to make sure the latest type information is available
      if (tsMorphCache) {
        // Update the source file in the project to reflect the latest changes
        const { project } = tsMorphCache
        const sourceFile = project.getSourceFileOrThrow(ctx.file)

        // Read the updated file content
        const updatedContent = await ctx.read()

        // Update the source file with the new content
        sourceFile.replaceWithText(updatedContent)
        // Project's type checker will automatically update with the new content
      }

      const affectedModules = await vineHMR(ctx, compilerCtx, compilerHooks)
      return affectedModules
    },
  }
}

export {
  createVinePlugin as vinePlugin,
}
