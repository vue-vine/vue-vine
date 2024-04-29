const isObject = (val: unknown) => val && typeof val === 'object'
const mergeArrayWithDedupe = (a: unknown[], b: unknown[]) => Array.from(new Set([...a, ...b]))

/**
 * Recursively merge the content of the new object to the existing one
 * @param target the existing object
 * @param obj the new object
 */
export function deepMerge(target: Record<string, any>, obj: Record<string, any>) {
  for (const key of Object.keys(obj)) {
    const oldVal = target
    const newVal = obj[key]

    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      target[key] = mergeArrayWithDedupe(oldVal, newVal)
    }
    else if (isObject(oldVal) && isObject(newVal)) {
      target[key] = deepMerge(oldVal, newVal)
    }
    else {
      target[key] = newVal
    }
  }

  return target
}

export default deepMerge
