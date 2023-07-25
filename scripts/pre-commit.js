import { readFileSync } from 'node:fs'
import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { r, runCommand } from './utils'

const LINT_STAGED = 'pnpm lint-staged'
const RUN_COMPILER_TEST = 'pnpm run test --run'

const msgPath = r('../.git/COMMIT_EDITMSG')
const commitRE
      = /^(revert: )?(feat|fix|docs|refactor|perf|test|workflow|build|ci|chore|types|wip|release)(\(.+\))?: .{1,50}/

async function runPreCommit() {
  // set log prefix
  setGlobalPrefix('[pre-commit]: ')

  try {
    log('info', 'Start @vue-vine/compiler test ...')
    await runCommand(RUN_COMPILER_TEST)

    // watching...
    log('info', 'Start lint format ...')
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
