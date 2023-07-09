import type { Pos, SgNode } from '@ast-grep/napi'
import type { CompilerError, Position } from '@vue/compiler-dom'
import { type VineDiagnostic, vineErr, vineWarn } from '../diagnostics'
import type { VineFileCtx } from '../types'

export function concating<T>(
  condition: boolean,
  arr: T[],
) {
  return condition ? arr : []
}

export function spaces(n: number) {
  return ' '.repeat(n)
}

export function showIf(condition: boolean, s: string, not?: string) {
  return condition ? s : (not ?? '')
}

export function filterJoin(
  arr: string[],
  join: string,
) {
  return arr.filter(Boolean).join(join)
}

export function isNotUselessPunc(node: SgNode) {
  return node.isNamed()
}

export function dedupe<T extends string | number | boolean>(arr: T[]) {
  return [...new Set(arr)]
}

function toAstGrepPos(pos: Position): Pos {
  return {
    index: pos.offset,
    line: pos.line - 1,
    column: pos.column - 1,
  }
}
const defaultVueErrLoc = { line: 0, column: 0, index: 0 }

export function transformVueDiagnosticForVine(
  vineFileCtx: VineFileCtx,
  diagnostic: CompilerError,
  type: 'error' | 'warning',
): VineDiagnostic {
  const loc = diagnostic.loc
  const creator = type === 'error' ? vineErr : vineWarn
  return creator(
    vineFileCtx,
    {
      msg: diagnostic.message,
      range: {
        start: loc ? toAstGrepPos(loc.start) : defaultVueErrLoc,
        end: loc ? toAstGrepPos(loc.end) : defaultVueErrLoc,
      },
    },
  )
}
