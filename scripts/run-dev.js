import { cliExec } from './utils'

const devCommand = 'cross-env NODE_ENV=development pnpm concurrently '
  + '-p "  {name}  " '
  + '-n "COMPILER,VITE,MAIN" '
  + '-c "bgGreen.bold,bgBlue.bold,bgMagenta.bold" '
  + '"pnpm run dev:compiler" '
  + '"sleep 6 && pnpm run dev:vite" '
  + '"sleep 12 && pnpm run dev:main"'

cliExec(devCommand)
