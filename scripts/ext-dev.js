import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { runCommand } from './utils'

async function runExtScript(mode) {
  const WATCH_COMPILER = 'pnpm --filter @vue-vine/compiler run build'
  const WATCH_EXT_TSC = `pnpm --filter vue-vine-extension run ${mode}:tsc`
  const WATCH_EXT_ESBUILD = `pnpm --filter vue-vine-extension run ${mode}:esbuild`
  const WATCH_LANGUAGE_SERVER = `pnpm --filter @vue-vine/language-server run ${mode}`

  // set log prefix
  setGlobalPrefix('[vue-vine]: ')

  try {
    await runCommand(WATCH_COMPILER)
    await Promise.all([
      runCommand(WATCH_EXT_TSC),
      runCommand(WATCH_EXT_ESBUILD),
      runCommand(WATCH_LANGUAGE_SERVER),
    ])
  }
  catch (e) {
    log('error', e)
  }
}

runExtScript(
  process.argv[2] === 'dev' ? 'watch' : 'build',
)
