import type { VineDiagnostic } from '@vue-vine/compiler'
import type { Diagnostic } from '@volar/language-server/node'
import { DiagnosticSeverity } from '@volar/language-server/node'

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
