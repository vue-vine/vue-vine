import { setTimeout } from 'node:timers/promises'

interface ProjectOptions {
  path: string
  name: string
}

export async function createProject(options: ProjectOptions) {
  // TODO
  await setTimeout(3000)
}
