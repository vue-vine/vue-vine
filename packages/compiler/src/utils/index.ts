import type { VineStyleLang } from '../types'
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
) {
  return condition ? arr : []
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

export function dedupe<T extends string | number | boolean>(arr: T[]) {
  return [...new Set(arr)]
}

export function getStyleLangFileExt(styleLang: VineStyleLang) {
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
) {
  const arr = storeMap.get(key)
  if (!arr) {
    storeMap.set(key, [value])
  }
  else {
    arr.push(value)
  }
}

export const camelize = cacheStringFunction((str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})

export const capitalize = cacheStringFunction(
  (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
)

export const isBuiltInDirective = /* #__PURE__ */ makeMap(
  'bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo',
)
