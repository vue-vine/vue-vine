import type { VineStyleLang } from '../types'
import { traverse } from '@babel/types'
import { makeMap } from './makeMap'

const camelizeRE = /-(\w)/g
function cacheStringFunction<T extends (str: string) => string>(fn: T): T {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as T
}

export function concating<T>(
  condition: boolean,
  arr: T[],
): T[] {
  return condition ? arr : []
}

export function showIf(condition: boolean, s: string, not?: string): string {
  return condition ? s : (not ?? '')
}

export function filterJoin(
  arr: string[],
  join: string,
): string {
  return arr.filter(Boolean).join(join)
}

export function dedupe<T extends string | number | boolean>(arr: T[]): T[] {
  return [...new Set(arr)]
}

export function getStyleLangFileExt(styleLang: VineStyleLang): string {
  if (styleLang === 'postcss') {
    return 'css'
  }
  else if (styleLang === 'stylus') {
    return 'styl'
  }
  return styleLang
}

export function appendToMapArray<K extends object, V>(
  storeMap: WeakMap<K, V[]>,
  key: K,
  value: V,
): void {
  const arr = storeMap.get(key)
  if (!arr) {
    storeMap.set(key, [value])
  }
  else {
    arr.push(value)
  }
}

export const camelize: (str: string) => string = cacheStringFunction((str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})

export const capitalize: (str: string) => string = cacheStringFunction(
  (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
)

export const isBuiltInDirective: (str: string) => boolean = /* #__PURE__ */ makeMap(
  'bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo',
)

export class ExitTraverseError extends Error {
  constructor() {
    super('ExitTraverse')
  }
}
export const exitTraverse: ExitTraverseError = new ExitTraverseError()
export const _breakableTraverse: typeof traverse = (node, handlers) => {
  try {
    return traverse(node, handlers)
  }
  catch (e) {
    if (e instanceof ExitTraverseError) {
      return
    }
    // else:
    throw e
  }
}

export function isBasicBoolTypeNames(type: string): boolean {
  return [
    'boolean',
    'Boolean',
    'true',
    'false',
  ].includes(type)
}

export function createLinkedCodeTag(
  side: 'left' | 'right',
  itemLength: number,
) {
  return `/* __LINKED_CODE_${side.toUpperCase()}__#${itemLength} */`
}
