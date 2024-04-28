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

export function creaateProjectOptions(params: Partial<ProjectOptions> = {}) {
  return params as ProjectOptions
}

export async function createProject(options: ProjectOptions) {
  const templateDirectory = (await getTemplateDirectory())!
  await renderTemplate(templateDirectory, options.path)
}
