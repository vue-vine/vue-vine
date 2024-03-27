import { setGlobalPrefix } from '@baiwusanyu/utils-log'
import { cliExec } from './utils'

async function runExtDevScript() {
  const command = 'cross-env NODE_ENV=development pnpm concurrently '
    + '-p "  {name}  " '
    + '-n "COMPILER,BUILD:EXT,LANG_SERVICE,LANG_SERVER" '
    + '-c "bgGreen.bold,bgBlue.bold,bgMagenta.bold" '
    + '"pnpm run build:compiler" '
    + '"pnpm run dev:lang-service" '
    + '"pnpm run dev:lang-server" '

  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  cliExec(command)
}

runExtDevScript()
