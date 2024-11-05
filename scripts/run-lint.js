import { env } from 'node:process'
import { runCommand } from './utils'

async function runLint() {
  if (env.RUN_ENV === 'ci') {
    await runCommand('pnpm run build:eslint', { title: '[Vue Vine Lint]' })
  }

  await runCommand('pnpm eslint .', { title: '[Vue Vine Lint]' })
}

runLint()
