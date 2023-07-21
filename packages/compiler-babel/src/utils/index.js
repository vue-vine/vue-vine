export function concating(condition, arr) {
  return condition ? arr : []
}
export function spaces(n) {
  return ' '.repeat(n)
}
export function showIf(condition, s, not) {
  return condition ? s : (not ?? '')
}
export function filterJoin(arr, join) {
  return arr.filter(Boolean).join(join)
}
export function dedupe(arr) {
  return [...new Set(arr)]
}
