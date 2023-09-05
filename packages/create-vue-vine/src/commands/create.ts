import { join, relative } from 'node:path'
import { rm } from 'node:fs/promises'
import { intro, log, outro, spinner } from '@clack/prompts'
import { Root, defineCommand } from 'clerc'
import gradient from 'gradient-string'
import { bold, green } from 'yoctocolors'
import { createProject } from '../create'
import { cancel, confirm, exists, getTemplateDirectory, text, validateProjectName } from '../utils'
import { getPmCommand, runPmCommand } from '../utils/pm'

const defaultProjectName = 'vue-vine-project'
const VUE_VINE = gradient.atlas('Vue Vine - Another style of writing Vue components')

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
    install: {
      type: Boolean,
      description: 'Install dependencies',
      alias: 'i',
    },
  },
  alias: 'create',
}, async (ctx) => {
  intro(VUE_VINE)
  const cwd = process.cwd()
  if (!ctx.parameters.projectName) {
    ctx.parameters.projectName = await text({
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
  const projectPath = join(cwd, ctx.parameters.projectName)
  if (await exists(projectPath)) {
    if (!ctx.flags.force) {
      ctx.flags.force = await confirm({
        message: `Folder ${ctx.parameters.projectName} already exists. Delete?`,
        initialValue: false,
      })
    }
    if (!ctx.flags.force) {
      cancel(`Folder ${ctx.parameters.projectName} already exists. Goodbye!`)
    }
    else {
      log.info(`Folder ${ctx.parameters.projectName} will be deleted.`)
      await rm(projectPath, { recursive: true })
    }
  }
  const templateDir = await getTemplateDirectory()
  if (!templateDir) {
    cancel('Unable to find template directory')
  }
  const s = spinner()
  s.start(`Creating project ${ctx.parameters.projectName}`)
  await createProject({
    path: projectPath,
    name: ctx.parameters.projectName,
    templateDir,
  })
  s.stop(`Project created at: ${projectPath}`)
  if (ctx.flags.install === undefined) {
    ctx.flags.install = await confirm({
      message: 'Install dependencies?',
      initialValue: true,
    })
  }

  if (ctx.flags.install) {
    s.start('Installing dependencies')
    await runPmCommand('install', projectPath)
    s.stop('Dependencies installed!')
  }
  const cdProjectPath = relative(cwd, projectPath)
  const helpText = [
    'You\'re all set! Now run:',
    '',
    `  cd ${bold(green(cdProjectPath.includes(' ') ? `"${cdProjectPath}"` : cdProjectPath))}`,
    ctx.flags.install ? undefined : `  ${bold(green(getPmCommand('install')))}`,
    `  ${bold(green(getPmCommand('dev')))}`,
    '',
    '  Happy hacking!',
  ].filter(s => s !== undefined).join('\n')
  outro(helpText)
  process.exit() // Ugh, why
})
