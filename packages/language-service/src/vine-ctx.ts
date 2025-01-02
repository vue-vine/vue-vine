import type { VineCompilerHooks, VineDiagnostic } from '@vue-vine/compiler'
import {
  compileVineTypeScriptFile,
  createCompilerCtx,
  createTsMorph,
} from '@vue-vine/compiler'

export function compileVineForVirtualCode(fileId: string, source: string) {
  const compilerCtx = createCompilerCtx({
    disableTsMorph: true, // No need ts-morph to analyze props
    envMode: 'module',
    vueCompilerOptions: {
      // 'module' will break Volar virtual code's mapping
      mode: 'function',
      // These options below is for resolving conflicts
      // with original compiler's mode: 'module'
      cacheHandlers: false,
      prefixIdentifiers: false,
      scopeId: null,
    },
  })
  const vineCompileErrs: VineDiagnostic[] = []
  const vineCompileWarns: VineDiagnostic[] = []
  const compilerHooks: VineCompilerHooks = {
    onError: err => vineCompileErrs.push(err),
    onWarn: warn => vineCompileWarns.push(warn),
    getCompilerCtx: () => compilerCtx,
    getTsMorph: () => createTsMorph(fileId),
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
