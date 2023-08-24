export function areStrArraysEqual(arr1: string[], arr2: string[]) {
  const set1 = new Set(arr1)
  const set2 = new Set(arr2)

  if (set1.size !== set2.size) {
    return false
  }

  for (const item of set1) {
    if (!set2.has(item)) {
      return false
    }
  }
  return true
}

export function normalizeLineEndings(str: string) {
  return str.replace(/\r\n/g, '\n')
}
