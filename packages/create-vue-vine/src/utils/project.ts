import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exists } from './fs'

export function validateProjectName(path: string): boolean {
  return basename(path) === path
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function getTemplateDirectory(): Promise<string | undefined> {
  const templateRoot = resolve(__dirname, '..', 'template')
  return await exists(templateRoot) ? templateRoot : undefined
}
