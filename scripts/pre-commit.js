import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { decode, runCommand } from './utils'

const LINT_STAGED = 'pnpm lint-staged'
const RUN_COMPILER_TEST = 'pnpm run test:compiler --run'

async function runPreCommit() {
  // set log prefix
  setGlobalPrefix('[pre-commit]: ')

  try {
    log('info', 'Start @vue-vine/compiler test ...')
    await runCommand(RUN_COMPILER_TEST)

    // watching...
    log('info', 'Start lint format ...')
    await runCommand(LINT_STAGED)
  }
  catch (e) {
    log('error', decode(e))
  }
}

runPreCommit()
