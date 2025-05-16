import { LRUCache } from 'lru-cache'

export function createCache<T extends object>(
  max = 500,
): Map<string, T> | LRUCache<string, T> {
  return new LRUCache({ max })
}
