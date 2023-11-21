import { setGlobalPrefix } from '@baiwusanyu/utils-log'
import { cliExec } from './utils'

async function runExtScript() {
  const command = 'cross-env NODE_ENV=development pnpm concurrently '
    + '-p "  {name}  " '
    + '-n "COMPILER,EXT:ESBUILD,EXT:TSC,LSP" '
    + '-c "bgGreen.bold,bgBlue.bold,bgMagenta.bold,bgYellow.bold" '
    + '"rollup -w -c ./packages/compiler/rollup.config.mjs" '
    + '"sleep 6 && pnpm --filter vue-vine-extension run watch:esbuild" '
    + '"sleep 6 && pnpm --filter vue-vine-extension run watch:tsc" '
    + '"sleep 12 && pnpm --filter @vue-vine/language-server run watch" '

  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  cliExec(command)
}

runExtScript()
