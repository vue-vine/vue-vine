import { setTimeout as sleep } from 'node:timers/promises'
import { exit as processExit } from 'node:process'
import { defineCommand, runMain } from 'citty'
import { cancel, intro, isCancel, outro, text } from '@clack/prompts'
import color from 'picocolors'
import { bugs, description, name as pkgName, version as pkgVersion } from '../package.json'

const main = defineCommand({
  meta: {
    name: pkgName,
    description,
    version: pkgVersion,
  },
  args: {
    template: {
      type: 'string',
      description: 'The template to use for the project',
      alias: 't',
    },
    force: {
      type: 'boolean',
      description: 'Force to create if the directory is not empty',
      alias: 'f',
    },
  },
  async run({ args }) {
    const name = args._[0]?.trim() ?? ''
    const template = args.template?.trim()

    if (name && template) {
      // degit
      return
    }

    intro(color.bgGreen(color.white(`${pkgName} v${pkgVersion}`)))

    const projectName = await text({
      message: 'Project name',
      placeholder: 'my-vue-vine-app',
      validate: (input) => {
        if (!input.length) {
          return 'Project name is required'
        }
      },
    })

    if (isCancel(projectName)) {
      cancel('Cancelled')
      processExit(0)
    }

    // TODO: waiting for starter template migration
    // eslint-disable-next-line no-console
    console.log(projectName)

    outro(`Problems? ${bugs.url}`)

    await sleep(1000)
  },
})

runMain(main).catch(console.error)
