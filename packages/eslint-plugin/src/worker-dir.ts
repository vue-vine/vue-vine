import { fileURLToPath } from 'node:url'

export const workerDir = fileURLToPath(new URL('../worker', import.meta.url))
