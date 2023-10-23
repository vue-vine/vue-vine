import process from 'node:process'
import { setGlobalPrefix } from '@baiwusanyu/utils-log'
import { cliExec } from './utils'

async function runExtScript(mode) {
  const command = 'cross-env NODE_ENV=development pnpm concurrently '
    + '-p "  {name}  " '
    + '-n "COMPILER,EXT:ESBUILD,EXT:TSC,LSP" '
    + '-c "bgGreen.bold,bgBlue.bold,bgMagenta.bold,bgYellow.bold" '
    + '"rollup -w -c ./packages/compiler/rollup.config.mjs" '
    + '"pnpm --filter vue-vine-extension run dev" '
    + `"sleep 6 && pnpm --filter vue-vine-extension run ${mode}:tsc" `
    + `"sleep 6 && pnpm --filter vue-vine-extension run ${mode}:esbuild" `
    + `"sleep 12 && pnpm --filter @vue-vine/language-server run ${mode}" `

  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  cliExec(command)
}

runExtScript(
  process.argv[2] === 'dev' ? 'watch' : 'build',
)
