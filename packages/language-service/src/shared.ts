/* eslint-disable no-console */

import type { Diagnostic, VirtualCode } from '@volar/language-server/node'
import type { VineDiagnostic, VineFileCtx } from '@vue-vine/compiler'
import { DiagnosticSeverity } from '@volar/language-server/node'

export const VUE_VINE_VIRTUAL_CODE_ID = 'vue-vine-virtual-code'

export function getVineTempPropName(propName: string) {
  return `__VINE_VLS_TEMP_PROP_${propName}__`
}
export interface VueVineCode extends VirtualCode {
  __VUE_VINE_VIRTUAL_CODE__: true
  vineMetaCtx: {
    vineCompileErrs: VineDiagnostic[]
    vineCompileWarns: VineDiagnostic[]
    vineFileCtx: VineFileCtx
  }

  get fileName(): string
}

export function transformVineDiagnostic(
  diag: VineDiagnostic,
  type: 'err' | 'warn',
): Diagnostic {
  let startLine = diag.location?.start.line

  // Babel location is 1 based
  // while VSCode Diagnostic is 0 based
  if (startLine !== undefined) {
    startLine -= 1
  }
  let startColumn = diag.location?.start.column
  if (startColumn !== undefined) {
    startColumn -= 1
  }
  let endLine = diag.location?.end.line
  if (endLine !== undefined) {
    endLine -= 1
  }
  let endColumn = diag.location?.end.column
  if (endColumn !== undefined) {
    endColumn -= 1
  }

  return {
    severity: type === 'err'
      ? DiagnosticSeverity.Error
      : DiagnosticSeverity.Warning,
    range: {
      start: {
        line: startLine ?? 0,
        character: startColumn ?? 0,
      },
      end: {
        line: endLine ?? 0,
        character: endColumn ?? 0,
      },
    },
    source: 'vue-vine',
    message: diag.msg,
  }
}

export function turnBackToCRLF(code: string) {
  return code.replace(/\r?\n/g, '\r\n')
}

export function VLS_InfoLog(...msgs: any[]) {
  console.log(`[VLS]`, ...msgs)
}

export function VLS_ErrorLog(err: any, tag: string) {
  console.log(
    `[VLS] ${tag} error: ${String(err)}`,
  )
  if (err.stack) {
    const stackLines = err.stack.split('\n').slice(0, 6)
    console.log('--- Error stack trace:')
    console.log(stackLines.join('\n'))
  }
}

export function isVueVineVirtualCode(vCode: any): vCode is VueVineCode {
  return Boolean(vCode.__VUE_VINE_VIRTUAL_CODE__)
}
