import { ts } from '@ast-grep/napi'
import MagicString from 'magic-string'
import type { VineCompilerCtx, VineCompilerOptions, VineFileCtx } from './src/types'
import { ruleVineFunctionComponentDeclaration } from './src/ast-grep-rules'
import { validateVine } from './src/validate'
import { analyzeVine } from './src/analyze'
import { transformFile } from './src/transform'

const { parse } = ts

export {
  compileVineStyle,
} from './src/style/compile'
export {
  type VineCompilerOptions,
  type VineProcessorLang,
} from './src/types'

export function createCompilerCtx(
  options: VineCompilerOptions = {},
): VineCompilerCtx {
  return {
    fileCtxMap: new Map(),
    vineCompileErrors: [],
    vineCompileWarnings: [],
    options: {
      ...options,
    },
  }
}

export function compileVineTypeScriptFile(
  compilerCtx: VineCompilerCtx,
  code: string,
  fileId: string,
) {
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
  compilerCtx.fileCtxMap.set(fileId, vineFileCtx)

  const vineFnCompDecls = sgRoot.findAll(
    ruleVineFunctionComponentDeclaration,
  )
  if (vineFnCompDecls.length === 0) {
    // No vine function component declarations found
    return vineFileCtx
  }

  // 1. Validate all vine restrictions
  validateVine(compilerCtx, vineFileCtx, vineFnCompDecls)
  if (compilerCtx.vineCompileErrors.length > 0) {
    const allErrMsg = compilerCtx.vineCompileErrors.join('\n')
    compilerCtx.vineCompileErrors.length = 0
    throw new Error(
      `Vue Vine compilation failed:\n${allErrMsg}`,
    )
  }

  // No error, add vine function component context
  // 2. Analysis
  analyzeVine([compilerCtx, vineFileCtx], vineFnCompDecls)

  // 3. Codegen, or call it "transform"
  transformFile(vineFileCtx)

  return vineFileCtx
}
