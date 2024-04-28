import { getTemplateDirectory, renderTemplate } from './utils'

interface ProjectOptions {
  path: string
  name: string // TODO
  templateDir: string
}

export async function createProject(options: ProjectOptions) {
  const templateDirectory = (await getTemplateDirectory())!
  await renderTemplate(templateDirectory, options.path)
}
