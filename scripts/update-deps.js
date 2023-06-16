import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { runCommand } from './utils'

const TAZE_CMD = 'pnpm taze -r -w'
async function doUpdateDeps() {
  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  log('info', 'Updating deps...')
  try {
    // run command
    await runCommand(TAZE_CMD)

    log('info', 'update dependencies completes.')
  }
  catch (e) {
    log('error', e)
  }
}

doUpdateDeps()
