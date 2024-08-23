import MagicString from 'magic-string'
import type { Node } from '@babel/types'
import type { VineCompileCtx, VineCompilerCtx, VineCompilerHooks, VineCompilerOptions, VineFileCtx } from './types'
import { findVineCompFnDecls } from './babel-helpers/ast'
import { validateVine } from './validate'
import { analyzeVine } from './analyze'
import { transformFile } from './transform'
import { babelParse } from './babel-helpers/parse'

export {
  compileVineStyle,
} from './style/compile'

export {
  findVineCompFnDecls,
} from './babel-helpers/ast'

export {
  VineBindingTypes,
} from './constants'

export type {
  VineFileCtx,
  VineCompFnCtx as VineFnCompCtx,
  VineCompilerOptions,
  VineProcessorLang,
  VineCompilerHooks,
  VineDiagnostic,
  VineCompilerCtx,
  HMRCompFnsName,
} from './types'

export function createCompilerCtx(
  options: VineCompilerOptions = {},
): VineCompilerCtx {
  return {
    fileCtxMap: new Map(),
    vineCompileErrors: [],
    vineCompileWarnings: [],
    isRunningHMR: false,
    options: {
      inlineTemplate: true, // default inline template
      // Maybe some default options ...
      ...options,
    },
  }
}

export function createVineFileCtx(
  code: string,
  fileId: string,
  vineCompileCtx: VineCompileCtx,
) {
  const { fileCtxCache, babelParseOptions = {} } = vineCompileCtx
  const root = babelParse(code, babelParseOptions)
  const vineFileCtx: VineFileCtx = {
    root,
    fileId,
    renderOnly: fileCtxCache ? fileCtxCache.renderOnly : false,
    hmrCompFnsName: fileCtxCache ? fileCtxCache.hmrCompFnsName : null,
    isCRLF: code.includes('\r\n'),
    fileMagicCode: new MagicString(code),
    vineCompFns: [],
    userImports: {},
    styleDefine: {},
    vueImportAliases: {},
    get originCode() {
      return this.fileMagicCode.original
    },
    getAstNodeContent(node: Node) {
      return this.originCode.slice(node.start!, node.end!)
    },
  }
  return vineFileCtx
}

export function doValidateVine(
  vineCompilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
  vineCompFnDecls: Node[],
) {
  validateVine(vineCompilerHooks, vineFileCtx, vineCompFnDecls)
  vineCompilerHooks.onValidateEnd?.()
}

export function doAnalyzeVine(
  vineCompilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
  vineCompFnDecls: Node[],
) {
  analyzeVine(vineCompilerHooks, vineFileCtx, vineCompFnDecls)
  vineCompilerHooks.onAnalysisEnd?.()
}

export function compileVineTypeScriptFile(
  code: string,
  fileId: string,
  vineCompileCtx: VineCompileCtx,
) {
  const { compilerHooks } = vineCompileCtx
  const compilerOptions = compilerHooks.getCompilerCtx().options
  // Using babel to validate vine declarations
  const vineFileCtx: VineFileCtx = createVineFileCtx(code, fileId, vineCompileCtx)
  compilerHooks.onBindFileCtx?.(fileId, vineFileCtx)

  const vineCompFnDecls = findVineCompFnDecls(vineFileCtx.root)

  // 1. Validate all vine restrictions
  doValidateVine(compilerHooks, vineFileCtx, vineCompFnDecls)

  // 2. Analysis
  doAnalyzeVine(compilerHooks, vineFileCtx, vineCompFnDecls)

  // 3. Codegen, or call it "transform"
  transformFile(
    vineFileCtx,
    compilerHooks,
    compilerOptions?.inlineTemplate ?? true,
  )

  compilerHooks.onEnd?.()

  return vineFileCtx
}
