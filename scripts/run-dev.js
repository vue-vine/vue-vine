import { cliExec } from './utils'

const devCommand = 'cross-env NODE_ENV=development pnpm concurrently '
  + '-p "  {name}  " '
  + '-n "COMPILER,VITE,MAIN" '
  + '-c "bgGreen.bold,bgBlue.bold,bgMagenta.bold" '
  + '"rollup -w -c ./packages/compiler/rollup.config.mjs" '
  + '"sleep 6 && npx rollup -w -c ./packages/vite-plugin/rollup.config.mjs" '
  + '"sleep 12 && rimraf ./packages/vue-vine/dist && rollup -w -c ./packages/vue-vine/rollup.config.mjs"'

cliExec(devCommand)
