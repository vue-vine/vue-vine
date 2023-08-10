import { setTimeout } from 'node:timers/promises'

interface ProjectOptions {
  projectPath: string
  projectName: string
}

export async function createProject(options: ProjectOptions) {
  // TODO
  await setTimeout(3000)
}
