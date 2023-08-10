import { setTimeout } from 'node:timers/promises'

interface ProjectOptions {
  projectPath: string
  projectName: string
}

export async function createProject(optinos: ProjectOptions) {
  // TODO
  await setTimeout(3000)
}
