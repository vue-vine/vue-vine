import type { Plugin } from 'vite'
import { createLogger } from 'vite'
import {
  compileVineStyle,
  compileVineTypeScriptFile,
  createCompilerCtx,
} from '@vue-vine/compiler'
import type {
  VineCompilerOptions,
  VineProcessorLang,
} from '@vue-vine/compiler'
import type { VineQuery } from './src/parse-query'
import { parseQuery } from './src/parse-query'
import { handleHotUpdate } from './src/hot-update'
import { QUERY_TYPE_STYLE } from './src/constants'

function createVinePlugin(options: VineCompilerOptions = {}): Plugin {
  const compilerCtx = createCompilerCtx({
    ...options,
    inlineTemplate: options.inlineTemplate ?? process.env.NODE_ENV === 'production',
  })
  const panicOnCompilerError = () => {
    if (compilerCtx.vineCompileErrors.length > 0) {
      const allErrMsg = compilerCtx.vineCompileErrors
        .map(diagnositc => diagnositc.full)
        .join('\n')
      compilerCtx.vineCompileErrors.length = 0
      throw new Error(
        `Vue Vine compilation failed:\n${allErrMsg}`,
      )
    }
  }
  const runCompileScript = (code: string, fileId: string) => {
    const vineFileCtx = compileVineTypeScriptFile(
      code,
      fileId,
      {
        onOptionsResolved: cb => cb(compilerCtx.options),
        onError: errMsg => compilerCtx.vineCompileErrors.push(errMsg),
        onWarn: warnMsg => compilerCtx.vineCompileWarnings.push(warnMsg),
        onBindFileCtx: (fileId, fileCtx) => compilerCtx.fileCtxMap.set(fileId, fileCtx),
        onValidateEnd: panicOnCompilerError,
        onAnalysisEnd: panicOnCompilerError,
      },
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
      code: vineFileCtx.fileSourceCode.toString(),
      map: vineFileCtx.fileSourceCode.generateMap(),
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
    config(config) {
      // We need to exclude vine files from esbuild
      // because we don't want them to be transpiled to JS that early.
      if (!config.esbuild) {
        config.esbuild = {}
      }

      if (!config.esbuild.include) {
        config.esbuild.exclude = [
          /\.vine\.ts$/,
        ]
      }
      else if (
        typeof config.esbuild.exclude === 'string'
        || config.esbuild.exclude instanceof RegExp
      ) {
        // merge the original config value into an array
        config.esbuild.exclude = [
          config.esbuild.exclude,
          /\.vine\.ts$/,
        ] as any
      }
      else if (Array.isArray(config.esbuild.exclude)) {
        (config.esbuild.exclude as Array<(string | RegExp)>)
          .push(/\.vine\.ts$/)
      }
    },
    async resolveId(id) {
      const { query } = parseQuery(id)
      if (query.type === QUERY_TYPE_STYLE) {
        // serve vine style requests as virtual modules
        return id
      }
    },
    load(id) {
      const { fileId, query } = parseQuery(id)
      if (query.type === QUERY_TYPE_STYLE && query.scopeId) {
        const fullFileId = `${fileId}.vine.ts`
        const styleSource = compilerCtx.fileCtxMap
          .get(fullFileId)!
          .styleDefine[query.scopeId]
          .source
        return {
          code: styleSource,
        }
      }
    },
    async transform(code, id) {
      const { fileId, query } = parseQuery(id)
      if (query.type === QUERY_TYPE_STYLE) {
        const compiledStyle = await runCompileStyle(
          code,
          query,
          `${fileId /* This is virtual file id */}.vine.ts`,
        )
        return {
          code: compiledStyle,
        }
      }
      else if (!fileId.endsWith('.vine.ts')) {
        return
      }

      return runCompileScript(code, id)
    },
    handleHotUpdate,
  }
}

export {
  createVinePlugin as vinePlugin,
}
