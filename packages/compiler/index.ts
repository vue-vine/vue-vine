import MagicString from 'magic-string'
import type { Node } from '@babel/types'
import type { VineCompilerCtx, VineCompilerHooks, VineCompilerOptions, VineFileCtx } from './src/types'
import { findVineCompFnDecls } from './src/babel-helpers/ast'
import { validateVine } from './src/validate'
import { analyzeVine } from './src/analyze'
import { transformFile } from './src/transform'
import { babelParse } from './src/babel-helpers/parse'

export {
  compileVineStyle,
} from './src/style/compile'

export {
  findVineCompFnDecls,
} from './src/babel-helpers/ast'

export type {
  VineFileCtx,
  VineCompFnCtx as VineFnCompCtx,
  VineCompilerOptions,
  VineProcessorLang,
  VineCompilerHooks,
  VineDiagnostic,
  VineCompilerCtx,
} from './src/types'

export function createCompilerCtx(
  options: VineCompilerOptions,
): VineCompilerCtx {
  return {
    fileCtxMap: new Map(),
    vineCompileErrors: [],
    vineCompileWarnings: [],
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
) {
  const root = babelParse(code, {
    errorRecovery: true,
    sourceType: 'module',
    plugins: [
      'typescript',
    ],
  })
  const vineFileCtx: VineFileCtx = {
    originCode: code,
    fileId,
    fileSourceCode: new MagicString(code),
    vineCompFns: [],
    userImports: {},
    styleDefine: {},
    vueImportAliases: {},
    root,
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
  compilerHooks: VineCompilerHooks,
) {
  let compilerOptions: VineCompilerOptions = {}
  compilerHooks.onOptionsResolved((options) => {
    compilerOptions = options
  })
  // Using babel to validate vine declarations
  const vineFileCtx: VineFileCtx = createVineFileCtx(code, fileId)
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

  return vineFileCtx
}
