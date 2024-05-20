import { runCommand } from './utils'

const testCommand = 'cross-env NODE_ENV=test '
  + 'pnpm run test:compiler --run && '
  + 'pnpm run test:e2e --run && '
  + 'pnpm run test:eslint-parser'

runCommand(testCommand)
