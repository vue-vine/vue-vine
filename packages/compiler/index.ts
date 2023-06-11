import { ts } from '@ast-grep/napi'
import MagicString from 'magic-string'
import type { VineCompilerCtx, VineCompilerHooks, VineCompilerOptions, VineFileCtx } from './src/types'
import { ruleVineFunctionComponentDeclaration } from './src/ast-grep/rules-for-script'
import { validateVine } from './src/validate'
import { analyzeVine } from './src/analyze'
import { transformFile } from './src/transform'

const { parse } = ts

export {
  compileVineStyle,
} from './src/style/compile'

export {
  type VineDiagnostic,
} from './src/diagnostics'

export {
  type VineFileCtx,
  type VineFnCompCtx,
  type VineCompilerOptions,
  type VineProcessorLang,
  type VineCompilerHooks,
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

export function compileVineTypeScriptFile(
  code: string,
  fileId: string,
  compilerHooks: VineCompilerHooks,
) {
  let compilerOptions: VineCompilerOptions | undefined
  compilerHooks.onOptionsResolved((options) => {
    compilerOptions = options
  })
  // Using ast-grep to validate vine declarations
  const sgRoot = parse(
    // https://github.com/vue-vine/vue-vine/pull/24
    // ast-grep will exclude the escape characters in the first line,
    // which leads to a mismatch between the original code index
    // and the actual file index when the range method is used in the conversion stage,
    // then the original code cannot be completely removed by MagicString
    code.trim(),
  ).root()
  const vineFileCtx: VineFileCtx = {
    fileId,
    fileSourceCode: new MagicString(sgRoot.text()),
    vineFnComps: [],
    userImports: {},
    styleDefine: {},
    vueImportAliases: {},
    sgRoot,
  }
  compilerHooks.onBindFileCtx?.(fileId, vineFileCtx)

  const vineFnCompDecls = sgRoot.findAll(
    ruleVineFunctionComponentDeclaration,
  )

  // 1. Validate all vine restrictions
  validateVine(compilerHooks, vineFileCtx, vineFnCompDecls)
  compilerHooks.onValidateEnd?.()

  if (vineFnCompDecls.length === 0) {
    // No vine function component declarations found
    return vineFileCtx
  }

  // 2. Analysis
  analyzeVine([compilerHooks, vineFileCtx], vineFnCompDecls)

  // 3. Codegen, or call it "transform"
  transformFile(vineFileCtx, compilerOptions?.inlineTemplate ?? true)

  return vineFileCtx
}
