import { access } from 'node:fs/promises'

export function exists(path: string) {
  return access(path).then (() => true).catch(() => false)
}
