import type { Pos, SgNode } from '@ast-grep/napi'
import type { CompilerError, Position } from '@vue/compiler-dom'
import { type VineDiagnostic, vineErr, vineWarn } from '../diagnostics'
import type { VineFileCtx, VineFnCompCtx } from '../types'

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

function toAstGrepPos(
  pos: Position,
  bias?: { line: number; column: number; offset: number },
): Pos {
  const index = bias
    ? pos.offset + bias.offset
    : pos.offset
  const line = bias
    ? pos.line - 1 + bias.line
    : pos.line - 1
  const column = bias
    ? pos.column - 1 + bias.column
    : pos.column - 1
  return { index, line, column }
}
const defaultVueErrLoc = { line: 0, column: 0, index: 0 }

export function transformVueDiagnosticForVine(
  vineFileCtx: VineFileCtx,
  vineFnCompCtx: VineFnCompCtx,
  diagnostic: CompilerError,
  type: 'error' | 'warning',
): VineDiagnostic {
  const loc = diagnostic.loc

  const templateRange = vineFnCompCtx.template.range()

  const creator = type === 'error' ? vineErr : vineWarn
  const bias = {
    line: templateRange.start.line,
    column: templateRange.start.column,
    offset: templateRange.start.index + 1, // For the ` quote mark
  }
  return creator(
    vineFileCtx,
    {
      msg: diagnostic.message,
      range: {
        start: loc ? toAstGrepPos(loc.start, bias) : defaultVueErrLoc,
        end: loc ? toAstGrepPos(loc.end, bias) : defaultVueErrLoc,
      },
    },
  )
}
