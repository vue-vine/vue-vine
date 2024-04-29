import { basename, resolve } from 'node:path'
import { exists } from './fs'

export function validateProjectName(path: string) {
  return basename(path) === path
}

const __dirname = new URL('.', import.meta.url).pathname

export async function getTemplateDirectory() {
  const templateRoot = resolve(__dirname, '../template')
  return await exists(templateRoot) ? templateRoot : undefined
}
