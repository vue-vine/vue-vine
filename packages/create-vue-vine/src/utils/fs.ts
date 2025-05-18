import { access } from 'node:fs/promises'

export function exists(path: string): Promise<boolean> {
  return access(path).then (() => true).catch(() => false)
}
