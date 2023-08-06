import { log, setGlobalPrefix } from '@baiwusanyu/utils-log'
import { runCommand, spawnCommand } from './utils'
import { colorful } from './utils/color-str'

const BUILD_COMPILER = 'pnpm --filter @vue-vine/compiler run build'
const BUILD_VITE_PLUGIN = 'pnpm --filter @vue-vine/vite-plugin run build'
const BUILD_VUE_VINE = 'pnpm --filter vue-vine run build'

const DEV_COMPILER = ['pnpm', ['--filter', '@vue-vine/compiler', 'run', 'dev']]
const DEV_VITE_PLUGIN = ['pnpm', ['--filter', '@vue-vine/vite-plugin', 'run', 'dev']]
const DEV_VUE_VINE = ['pnpm', ['--filter', 'vue-vine', 'run', 'dev']]

async function run(isDev) {
  // set log prefix
  setGlobalPrefix(`${colorful(' VUE VINE ', ['white', 'bgGreen', 'bold'])} `)

  try {
    // build all packages before dev
    log('info', 'Start build ...')
    await runCommand(BUILD_COMPILER, { title: 'BUILD COMPILER' })
    await runCommand(BUILD_VITE_PLUGIN, { title: 'BUILD VITE PLUGIN' })
    await runCommand(BUILD_VUE_VINE, { title: 'BUILD VINE MAIN ENTRY' })

    if (isDev) {
      // run dev command
      log('info', 'Start dev ...')
      await Promise.all([
        spawnCommand(...DEV_COMPILER, { title: 'DEV COMPILER' }),
        spawnCommand(...DEV_VITE_PLUGIN, { title: 'DEV VITE PLUGIN' }),
        spawnCommand(...DEV_VUE_VINE, { title: 'DEV VINE MAIN ENTRY' }),
      ])
    }
  }
  catch (e) {
    log('error', e)
  }
}

// check if args has `--dev`,
// if true, run dev command after build finished
run(
  process.argv.includes('--dev'),
)
