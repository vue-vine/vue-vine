import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { intro, log, outro, spinner } from '@clack/prompts'
import { defineCommand, Root } from 'clerc'
import { bold, green } from 'yoctocolors'
import { createProject, createProjectOptions } from '../create'
import { useFlags } from '../flags'
import { cancel, confirm, exists, formatPmCommand, getPmCommand, getTemplateDirectory, gradientBanner, runPmCommand, text, validateProjectName } from '../utils'

const defaultProjectName = 'vue-vine-project'

const { flags, executeFlags } = useFlags()

export const createCommand = defineCommand({
  name: Root,
  description: 'Create a Vue Vine project',
  parameters: [
    '[projectName]',
  ],
  flags: {
    force: {
      type: Boolean,
      description: 'Delete existing folder',
      alias: 'f',
      default: false,
    },
    ...flags,
  },
  alias: 'create',
}, async (ctx) => {
  intro(gradientBanner)

  // Check whether the template exists first,
  // otherwise everything is meaningless.
  const templateDir = await getTemplateDirectory()
  if (!templateDir) {
    cancel('Unable to find template directory')
  }

  let projectName = ctx.parameters.projectName || defaultProjectName

  if (!ctx.parameters.projectName) {
    projectName = await text({
      message: 'Project name:',
      placeholder: defaultProjectName,
      defaultValue: defaultProjectName,
      validate: (value) => {
        if (!validateProjectName(value)) {
          return 'Invalid project name'
        }
      },
    })
  }

  const cwd = process.cwd()
  const projectPath = join(cwd, projectName)

  const isSameProjectExists = await exists(projectPath)
  if (isSameProjectExists) {
    if (!ctx.flags.force) {
      ctx.flags.force = await confirm({
        message: `Folder ${projectName} already exists. Delete?`,
        initialValue: false,
      })
    }

    if (!ctx.flags.force) {
      cancel(`Folder ${projectName} already exists. Goodbye!`)
    }
    else {
      log.info(`Folder ${projectName} will be deleted.`)
      await rm(projectPath, { recursive: true })
    }
  }

  const projectOptions = createProjectOptions({
    path: projectPath,
    name: projectName,
    templateDir,
  })

  await executeFlags(ctx.flags, projectOptions)

  const s = spinner()
  s.start(`Creating project ${projectName}`)
  await createProject(projectOptions)
  s.stop(`Project created at: ${projectPath}`)

  if (ctx.flags.install) {
    s.start('Installing dependencies')
    await runPmCommand('install', projectPath)
    s.stop('Dependencies installed!')
  }

  const helpText = [
    'You\'re all set! Now run:',
    '',
    `   cd ${bold(green(projectName.includes(' ') ? `"${projectName}"` : projectName))}`,
    ctx.flags.install ? undefined : `   ${bold(green(formatPmCommand(getPmCommand('install'))))}`,
    `   ${bold(green(formatPmCommand(getPmCommand('dev'))))}`,
    '',
    '   Happy hacking!',
  ].filter(s => s !== undefined).join('\n')

  outro(helpText)
  process.exit() // Ugh, why
})
