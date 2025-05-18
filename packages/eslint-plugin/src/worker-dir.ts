import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const workerDir: string = (
  typeof __filename === 'string'
    ? resolve(__filename, '../worker')
    : fileURLToPath(new URL('../worker', import.meta.url))
)
