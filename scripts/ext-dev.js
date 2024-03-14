import { setGlobalPrefix } from '@baiwusanyu/utils-log'
import { cliExec } from './utils'

async function runExtScript() {
  const command = 'cross-env NODE_ENV=development pnpm concurrently '
    + '-p "  {name}  " '
    + '-n "COMPILER,BUILD:EXT,LSP" '
    + '-c "bgGreen.bold,bgBlue.bold,bgMagenta.bold" '
    + '"nr build:compiler" '
    + '"sleep 6 && pnpm --filter vue-vine-extension run dev" '
    + '"sleep 12 && pnpm --filter @vue-vine/language-server run dev" '

  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  cliExec(command)
}

runExtScript()
