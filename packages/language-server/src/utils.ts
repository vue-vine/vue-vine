import type { VineDiagnostic } from '@vue-vine/compiler'
import type { Diagnostic } from '@volar/language-server/node'
import { DiagnosticSeverity } from '@volar/language-server/node'
import type { CompilerError } from '@vue/compiler-dom'
import type { VineFile } from './language'

export function transformVineDiagnostic(
  file: VineFile,
  diag: VineDiagnostic,
  type: 'err' | 'warn',
): Diagnostic {
  return {
    severity: type === 'err'
      ? DiagnosticSeverity.Error
      : DiagnosticSeverity.Warning,
    range: {
      start: file.textDocument.positionAt(diag.range?.start.index ?? 0),
      end: file.textDocument.positionAt(diag.range?.end.index ?? 0),
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
