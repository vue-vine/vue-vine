import { join } from 'node:path'
import { getTemplateDirectory, renderTemplate } from './utils'

export interface ProjectOptions {
  path: string
  name: string // TODO
  templateDir: string

  deps: { name: string, version: string, type: 'devDependancy' | 'dependancy' }[]
  features: { name: string, path: string }[]
  sourceTemplates: string[]
  sourceCodes: { path: string, content: string }[]
}

export function creaateProjectOptions(params: Pick<ProjectOptions, 'path' | 'name' | 'templateDir'>): ProjectOptions {
  return {
    ...params,

    deps: [],
    features: [],
    sourceTemplates: [],
    sourceCodes: [],
  }
}

export async function createProject(options: ProjectOptions) {
  const templateDirectory = (await getTemplateDirectory())!
  const withBase = (path: string) => join(templateDirectory, path)

  const tasks: Promise<void>[] = [
    ...['common', ...options.sourceTemplates].map(path => renderTemplate(withBase(path), options.path)),
  ]
  await Promise.all(tasks)
}
