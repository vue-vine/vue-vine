import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getTemplateDirectory, renderTemplate } from './utils'

export interface ProjectOptions {
  path: string
  name: string
  templateDir: string
  buildTool: 'vite' | 'rsbuild'
  templates: string[]
}

function getBuiltInTemplates(buildTool: 'vite' | 'rsbuild'): string[] {
  return [
    'shared/base',
    'shared/config/ts',
    'shared/config/eslint',
    `${buildTool}/base`,
  ]
}

export function createProjectOptions(
  params: Omit<ProjectOptions, 'templates'>,
): ProjectOptions {
  return {
    ...params,
    templates: [],
  }
}

export function initBuiltInTemplates(options: ProjectOptions): void {
  options.templates.push(...getBuiltInTemplates(options.buildTool))
}

export async function createProject(options: ProjectOptions): Promise<void> {
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

  for (const template of options.templates) {
    await renderTemplate(withBase(template), options.path)
  }
}
