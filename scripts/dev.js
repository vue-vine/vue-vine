import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { decode, runCommand } from './utils'

const PRE_BUILD_CMD = 'pnpm nx build vue-vine'
const WATCH_CMD = 'pnpm nx watch --projects=@vue-vine/compiler,@vue-vine/vite-plugin,vue-vine -- nx build vue-vine'
async function runDev() {
  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  try {
    // run command
    // build vue-vine
    await runCommand(PRE_BUILD_CMD)
    log('success', 'Build vue-vine done!')

    // watching...
    log('info', 'Start watching changes...')
    await runCommand(WATCH_CMD)
  }
  catch (e) {
    log('error', decode(e))
  }
}

runDev()
