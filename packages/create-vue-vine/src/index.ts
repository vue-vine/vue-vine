import { join } from 'node:path'
import { intro, outro, spinner } from '@clack/prompts'
import { Clerc, Root, friendlyErrorPlugin, helpPlugin, notFoundPlugin, strictFlagsPlugin } from 'clerc'
import gradient from 'gradient-string'

import { description, name, version } from '../package.json'
import { createProject } from './create'
import { cancel, text, validateProjectName } from './utils'

const defaultProjectName = 'vue-vine-project'

const VUE_VINE = gradient.atlas('Vue Vine - Another style of writing Vue components')

Clerc.create(name, version, description)
  .use(helpPlugin())
  .use(notFoundPlugin())
  .use(strictFlagsPlugin())
  .use(notFoundPlugin())
  .use(friendlyErrorPlugin())
  .command(Root, 'Create a Vue Vine project', {
    parameters: [
      '[projectName]',
    ],
    alias: 'create',
  })
  .on(Root, async (ctx) => {
    intro(VUE_VINE)
    const cwd = process.cwd()
    if (!ctx.parameters.projectName) {
      ctx.parameters.projectName = await text({
        message: 'Project name:',
        placeholder: defaultProjectName,
        initialValue: defaultProjectName,
        defaultValue: defaultProjectName,
      })
      if (!validateProjectName(ctx.parameters.projectName)) {
        // TODO
        cancel(`Invalid project name: ${ctx.parameters.projectName}`)
      }
    }
    const projectPath = join(cwd, ctx.parameters.projectName)
    const s = spinner()
    s.start(`Creating project ${ctx.parameters.projectName}`)
    await createProject(projectPath, ctx.parameters.projectName)
    s.stop('Project created!')
    outro('You\'re all set!')
  })
  .parse()
