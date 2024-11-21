import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exists } from './fs'

export function validateProjectName(path: string) {
  return basename(path) === path
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function getTemplateDirectory() {
  const templateRoot = resolve(__dirname, '../template')
  return await exists(templateRoot) ? templateRoot : undefined
}
