import { basename, resolve } from 'node:path'
import { exists } from './fs'
import { fileURLToPath } from 'node:url'

export function validateProjectName(path: string) {
  return basename(path) === path
}

const __dirname = fileURLToPath(import.meta.url)

export async function getTemplateDirectory() {
  const templateRoot = resolve(__dirname, '../template')
  return await exists(templateRoot) ? templateRoot : undefined
}
