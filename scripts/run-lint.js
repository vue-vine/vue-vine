import { env } from 'node:process'
import { runCommand } from './utils'
import { toExitErr } from './utils/err-catch'

async function runLint() {
  const cmdOptions = { title: '[Vue Vine Lint]' }
  if (env.RUN_ENV === 'ci') {
    await runCommand('pnpm run build:eslint', cmdOptions)
  }

  await runCommand('pnpm eslint .', cmdOptions)
}

runLint().catch(toExitErr)
