export function areStrArraysEqual(arr1: string[], arr2: string[]) {
  const set1 = new Set(arr1)
  const set2 = new Set(arr2)

  return set1.size === set2.size
    && [...set1].every(item => set2.has(item))
}

export function normalizeLineEndings(str: string) {
  return str.replace(/\r\n/g, '\n')
}
