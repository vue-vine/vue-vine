import { setGlobalPrefix } from '@baiwusanyu/utils-log'
import { cliExec } from './utils'

async function runExtScript() {
  const command = 'cross-env NODE_ENV=development pnpm concurrently '
    + '-p "  {name}  " '
    + '-n "COMPILER,BUILD:EXT,LSP" '
    + '-c "bgGreen.bold,bgBlue.bold,bgMagenta.bold" '
    + '"pnpm run build:compiler" '
    + '"sleep 6 && pnpm run dev:ext" '
    + '"sleep 12 && pnpm run dev:ls" '

  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  cliExec(command)
}

runExtScript()
