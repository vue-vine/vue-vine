import { basename, join } from 'node:path'
import { packageDirectory as getPackageDirectory } from 'pkg-dir'
import { exists } from './fs'

export function validateProjectName(path: string) {
  return basename(path) === path
}

export async function getTemplateDirectory() {
  const packageDirectory = await getPackageDirectory()
  if (!packageDirectory) {
    return
  }
  const templateDirectory = join(packageDirectory, 'template')
  return await exists(templateDirectory) ? templateDirectory : undefined
}
