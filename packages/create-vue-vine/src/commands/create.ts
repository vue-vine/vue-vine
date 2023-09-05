import { join } from 'node:path'
import { intro, outro, spinner } from '@clack/prompts'
import { Root, defineCommand } from 'clerc'
import gradient from 'gradient-string'
import { createProject } from '../create'
import { text, validateProjectName } from '../utils'

const defaultProjectName = 'vue-vine-project'
const VUE_VINE = gradient.atlas('Vue Vine - Another style of writing Vue components')

export const createCommand = defineCommand({
  name: Root,
  description: 'Create a Vue Vine project',
  parameters: [
    '[projectName]',
  ],
  flags: {

  },
  alias: 'create',
}, async (ctx) => {
  intro(VUE_VINE)
  const cwd = process.cwd()
  if (!ctx.parameters.projectName) {
    ctx.parameters.projectName = await text({
      message: 'Project name:',
      placeholder: defaultProjectName,
      initialValue: defaultProjectName,
      defaultValue: defaultProjectName,
      validate: (value) => {
        if (!validateProjectName(value)) {
          return 'Invalid project name'
        }
      },
    })
  }
  const projectPath = join(cwd, ctx.parameters.projectName)
  const s = spinner()
  s.start(`Creating project ${ctx.parameters.projectName}`)
  await createProject({
    path: projectPath,
    name: ctx.parameters.projectName,
  })
  s.stop('Project created!')
  outro('You\'re all set!')
})
