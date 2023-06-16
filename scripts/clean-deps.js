import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { deleteAsync } from 'del'

const PKGS_NODE_MODULES = ['packages/**/node_modules']
async function doCleanDeps() {
  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  log('info', 'Start clearing all deps.')

  try {
    // remove node_modules from packages
    await deleteAsync(PKGS_NODE_MODULES)

    log('info', 'Finished cleaning all deps.')
  }
  catch (e) {
    log('error', e)
  }
}

doCleanDeps()
