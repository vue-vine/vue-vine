import type { VineCompilerHooks, VineDiagnostic } from '@vue-vine/compiler'
import {
  compileVineTypeScriptFile,
  createCompilerCtx,
} from '@vue-vine/compiler'

export function createVineFileCtx(sourceFileName: string, source: string) {
  const compilerCtx = createCompilerCtx({
    envMode: 'module',
    vueCompilerOptions: {
      mode: 'function', // 'module' will break Volar virtual code's mapping
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
    sourceFileName,
    compilerHooks,
  )

  return vineFileCtx
}
