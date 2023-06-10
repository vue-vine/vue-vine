import type { SgNode } from '@ast-grep/napi'

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
  return !node.isLeaf() || !node.isNamedLeaf()
}
