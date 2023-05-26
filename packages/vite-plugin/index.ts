import type { Plugin } from 'vite'
import { createLogger } from 'vite'
import { ts } from '@ast-grep/napi'
import MagicString from 'magic-string'
import type { VineFileCtx, VinePluginOptions, VineProcessorLang } from './src/shared'
import { PLUGIN_NAME } from './src/shared'
import { validateVine } from './src/validate'
import { ruleVineFunctionComponentDeclaration } from './src/ast-grep-rules'
import { analyzeVine } from './src/analyze'
import { transformFile } from './src/transform'
import type { VineQuery } from './src/utils/parse-query'
import { QUERY_TYPE_STYLE, parseQuery } from './src/utils/parse-query'
import { doCompileStyle } from './src/style/compile'
import { pluginCtx } from './src/context'

const { parse } = ts

function createVinePlugin(options: VinePluginOptions = {}): Plugin {
  const compileVineTypeScript = (code: string, fileId: string) => {
    // Using ast-grep to validate vine declarations
    const sgRoot = parse(code).root()
    const vineFileCtx: VineFileCtx = {
      fileId,
      fileSourceCode: new MagicString(sgRoot.text()),
      vineFnComps: [],
      userImports: {},
      styleDefine: {},
      vueImportAliases: {},
      sgRoot,
    }
    pluginCtx.fileCtxMap.set(fileId, vineFileCtx)

    const vineFnCompDecls = sgRoot.findAll(
      ruleVineFunctionComponentDeclaration,
    )
    if (vineFnCompDecls.length === 0) {
      // No vine function component declarations found
      return code
    }

    // 1. Validate all vine restrictions
    validateVine(pluginCtx, vineFileCtx, vineFnCompDecls)
    if (pluginCtx.vineCompileErrors.length > 0) {
      throw new Error(
        `Vue Vine compilation failed:\n${
          pluginCtx.vineCompileErrors.join('\n')
        }`,
      )
    }

    // No error, add vine function component context
    // 2. Analysis
    analyzeVine([pluginCtx, vineFileCtx], vineFnCompDecls)

    // 3. Codegen, or call it "transform"
    transformFile(vineFileCtx)

    // Print all warnings
    const warnLogger = createLogger('warn')
    if (pluginCtx.vineCompileWarnings.length > 0) {
      for (const warn of pluginCtx.vineCompileWarnings) {
        warnLogger.warn(warn)
      }
    }

    return vineFileCtx.fileSourceCode.toString()
  }
  const compileVineStyle = async (
    styleSource: string,
    query: VineQuery,
    fileId: string,
  ) => {
    const { code: compiled } = await doCompileStyle({
      fileId,
      source: styleSource,
      isScoped: query.scoped,
      scopeId: query.scopeId,
      preprocessLang: query.lang as VineProcessorLang,
    })

    return compiled
  }

  pluginCtx.options = options
  return {
    name: PLUGIN_NAME,
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
        const styleSource = pluginCtx.fileCtxMap
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
        const compiledStyle = await compileVineStyle(
          code,
          query,
          `${fileId}.vine.ts`,
        )
        return {
          code: compiledStyle,
        }
      }
      else if (!fileId.endsWith('.vine.ts')) {
        return
      }

      return {
        code: compileVineTypeScript(code, id),
      }
    },
  }
}

export {
  createVinePlugin as vinePlugin,
  VinePluginOptions,
}
