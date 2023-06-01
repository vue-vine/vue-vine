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
import { QUERY_TYPE_STYLE, parseQuery } from './src/parse-query'
import { handleHotUpdate } from './src/hot-update'

function createVinePlugin(options: VineCompilerOptions = {}): Plugin {
  const compilerCtx = createCompilerCtx(options)
  const runCompile = (code: string, fileId: string) => {
    const vineFileCtx = compileVineTypeScriptFile(
      code,
      fileId,
      {
        onError: errMsg => compilerCtx.vineCompileErrors.push(errMsg),
        onWarn: warnMsg => compilerCtx.vineCompileWarnings.push(warnMsg),
        onBindFileCtx: (fileId, fileCtx) => compilerCtx.fileCtxMap.set(fileId, fileCtx),
        onValidateEnd: () => {
          if (compilerCtx.vineCompileErrors.length > 0) {
            const allErrMsg = compilerCtx.vineCompileErrors.join('\n')
            compilerCtx.vineCompileErrors.length = 0
            throw new Error(
              `Vue Vine compilation failed:\n${allErrMsg}`,
            )
          }
        },
      },
    )

    // Print all warnings
    const warnLogger = createLogger('warn')
    if (compilerCtx.vineCompileWarnings.length > 0) {
      for (const warn of compilerCtx.vineCompileWarnings) {
        warnLogger.warn(warn)
      }
    }
    compilerCtx.vineCompileWarnings.length = 0

    return vineFileCtx.fileSourceCode.toString()
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
    // Must before Vue plugin
    // to retain the original TypeScript code
    enforce: 'pre',
    async resolveId(id) {
      const { query } = parseQuery(id)
      if (query.type === 'vine-style') {
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

      return {
        code: runCompile(code, id),
      }
    },
    handleHotUpdate(hrmCtx) {
      return handleHotUpdate(hrmCtx)
    },
  }
}

export {
  createVinePlugin as vinePlugin,
}
