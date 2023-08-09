import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { runCommand } from './utils'
import { colorful } from './utils/color-str'

const TAZE_CMD = 'pnpm taze -r -w'
async function doUpdateDeps() {
  // set log prefix
  setGlobalPrefix(
    `${colorful(' UPDATE-DEPS ', ['black', 'bgBlue', 'bold'])}  `,
  )

  log('info', 'Updating deps...')
  try {
    // run command
    await runCommand(TAZE_CMD, { title: 'TAZE UPDATE' })

    log('info', 'update dependencies completes.')
  }
  catch (e) {
    log('error', e)
  }
}

doUpdateDeps()
