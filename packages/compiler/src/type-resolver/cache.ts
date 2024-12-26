import type TS from 'typescript'
import type { TypeScope } from './scope'
import { normalizePath } from './utils'

/**
 * Cache for file to scope mapping
 */
export const fileToScopeCache = createCache<TypeScope>()

/**
 * Cache for TypeScript config
 */
export const tsConfigCache = createCache<CachedConfig[]>()

/**
 * Maps TypeScript config references
 */
export const tsConfigRefMap = new Map<string, string>()

/**
 * Maps file to scope
 */
export const fileToScope = new Map<string, TypeScope>()

/**
 * Type definition for cached TypeScript config
 */
interface CachedConfig {
  config: TS.ParsedCommandLine
  cache?: TS.ModuleResolutionCache
}

/**
 * Creates a new cache instance
 */
export function createCache<T>() {
  const cache = new Map<string, T>()
  return {
    get(key: string) {
      return cache.get(key)
    },
    set(key: string, value: T) {
      cache.set(key, value)
      return value
    },
    delete(key: string) {
      return cache.delete(key)
    },
    has(key: string) {
      return cache.has(key)
    },
  }
}

/**
 * Invalidates type caches for a given file
 */
export function invalidateTypeCache(filename: string): void {
  filename = normalizePath(filename)
  fileToScopeCache.delete(filename)
  tsConfigCache.delete(filename)
  const affectedConfig = tsConfigRefMap.get(filename)
  if (affectedConfig) {
    tsConfigCache.delete(affectedConfig)
  }
}
