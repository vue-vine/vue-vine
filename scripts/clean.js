import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { deleteAsync } from 'del'
import { decode } from './utils'

const OUTPUT_NODE_MODULES = ['packages/**/dist', 'packages/**/tsconfig.tsbuildinfo', 'packages/**/out']
async function doCleanOutput() {
  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  log('info', 'Start clearing all output.')
  try {
    // remove dist from packages
    await deleteAsync(OUTPUT_NODE_MODULES)

    log('info', 'Finished cleaning all output.')
  }
  catch (e) {
    log('error', decode(e.message))
  }
}

doCleanOutput()
