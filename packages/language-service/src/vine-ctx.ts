import type { VineCompilerHooks, VineDiagnostic, VineFileCtx } from '@vue-vine/compiler'
import {
  compileVineTypeScriptFile,
  createCompilerCtx,
} from '@vue-vine/compiler'

export function compileVineForVirtualCode(fileId: string, source: string): {
  vineFileCtx: VineFileCtx
  vineCompileErrs: VineDiagnostic[]
  vineCompileWarns: VineDiagnostic[]
} {
  const compilerCtx = createCompilerCtx({
    envMode: 'module',
    vueCompilerOptions: {
      // 'module' will break Volar virtual code's mapping
      mode: 'function',
      // These options below is for resolving conflicts
      // with original compiler's mode: 'module'
      cacheHandlers: false,
      prefixIdentifiers: false,
      scopeId: null,
      __enableTransformAssetsURL: false,
      __shouldAddTemplateSuffix: true,
      __enableTransformBareAttrAsBool: {
        transformNegativeBool: true,
        constType: 0, // satisfies `ConstantTypes.NOT_CONSTANT`
      },
    },
    tsMorphOptions: {
      disabled: true, // No need ts-morph to analyze props
    },
  })
  const vineCompileErrs: VineDiagnostic[] = []
  const vineCompileWarns: VineDiagnostic[] = []
  const compilerHooks: VineCompilerHooks = {
    onError: err => vineCompileErrs.push(err),
    onWarn: warn => vineCompileWarns.push(warn),
    getCompilerCtx: () => compilerCtx,
  }
  const vineFileCtx = compileVineTypeScriptFile(
    source,
    fileId,
    {
      compilerHooks,
      babelParseOptions: {
        tokens: true,
      },
    },
  )

  return {
    vineFileCtx,
    vineCompileErrs,
    vineCompileWarns,
  }
}
