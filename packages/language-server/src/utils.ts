import type { VineDiagnostic } from '@vue-vine/compiler'
import type { Diagnostic } from '@volar/language-server/node'
import { DiagnosticSeverity } from '@volar/language-server/node'
import type { CompilerError } from '@vue/compiler-dom'
import type { VineFile } from './language'

export function transformVineDiagnostic(
  _: VineFile,
  diag: VineDiagnostic,
  type: 'err' | 'warn',
): Diagnostic {
  return {
    severity: type === 'err'
      ? DiagnosticSeverity.Error
      : DiagnosticSeverity.Warning,
    range: {
      start: {
        line: diag.location?.start.line ?? 0,
        character: diag.location?.start.column ?? 0,
      },
      end: {
        line: diag.location?.end.line ?? 0,
        character: diag.location?.end.column ?? 0,
      },
    },
    source: 'vue-vine',
    message: diag.msg,
  }
}

export function transformVueDiagnostic(
  file: VineFile,
  diagnostic: CompilerError,
  type: 'err' | 'warn',
): Diagnostic {
  return {
    severity: type === 'err'
      ? DiagnosticSeverity.Error
      : DiagnosticSeverity.Warning,
    range: {
      start: file.textDocument.positionAt(diagnostic.loc?.start.offset ?? 0),
      end: file.textDocument.positionAt(diagnostic.loc?.end.offset ?? 0),
    },
    source: 'vue-vine',
    message: diagnostic.message,
  }
}

export function getSlotsPropertyName(vueVersion: number) {
  return vueVersion < 3 ? '$scopedSlots' : '$slots'
}
