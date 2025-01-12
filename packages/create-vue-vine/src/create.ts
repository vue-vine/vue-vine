import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getTemplateDirectory, renderTemplate } from './utils'

const builtInTemplates = [
  'common',
  'code/base',
  'config/ts',
  'config/eslint',
]

export interface ProjectOptions {
  path: string
  name: string
  templateDir: string

  templates: string[]
}

export function createProjectOptions(
  params: Omit<ProjectOptions, 'templates'>,
): ProjectOptions {
  return {
    ...params,
    templates: [],
  }
}

export async function createProject(options: ProjectOptions) {
  const templateDirectory = (await getTemplateDirectory())!
  const withBase = (path: string) => join(templateDirectory, path)

  // support nested directory, e.g. test/a/b
  await mkdir(options.path, { recursive: true })

  const splitName = options.name.startsWith('@')
    ? options.name
    // ../foo/ -> foo
    : options.name.replace('/', '-').replace(/^[./]+|-+$/, '')

  await writeFile(
    join(options.path, 'package.json'),
    JSON.stringify({
      name: splitName,
    }, null, 2),
  )

  for (const template of [
    ...builtInTemplates,
    ...options.templates,
  ]) {
    await renderTemplate(withBase(template), options.path)
  }
}
