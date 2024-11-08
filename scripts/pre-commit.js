import { readFileSync } from 'node:fs'
import process from 'node:process'
import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { r, runCommand } from './utils'
import { colorful } from './utils/color-str'

const PNPM_INSTALL = 'pnpm install'
const RUN_LINT = 'pnpm run lint'
const RUN_BUILD = 'pnpm run build'
const LINT_STAGED = 'pnpm lint-staged'
const RUN_TEST = 'pnpm run test --run'

const msgPath = r('../.git/COMMIT_EDITMSG')
const commitRE
      // eslint-disable-next-line regexp/no-unused-capturing-group
      = /^(revert: )?(feat|fix|docs|refactor|perf|test|workflow|build|ci|chore|types|wip|release)(\(.+\))?: .{1,50}/

async function runPreCommit() {
  // set log prefix
  setGlobalPrefix(
    `${colorful(' PRE-COMMIT ', ['black', 'bgBlue', 'bold'])
    }  `,
  )

  try {
    log('info', 'Start install dependencies ...')
    await runCommand(PNPM_INSTALL)

    log('info', 'Start run build ...')
    await runCommand(RUN_BUILD)

    log('info', 'Start test ...')
    await runCommand(RUN_TEST)

    log('info', 'Start lint ...')
    await runCommand(RUN_LINT)

    log('info', 'Start lint staged ...')
    await runCommand(LINT_STAGED)

    const msg = readFileSync(msgPath, 'utf-8').trim()
    log('info', `Commit message: ${msg}`)
    if (!commitRE.test(msg)) {
      log('error', 'Error: Git commit message must follow standard format!')
      process.exit(1)
    }
  }
  catch (e) {
    log('error', e)
  }
}

runPreCommit()
