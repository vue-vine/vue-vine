import { runCommand } from './utils'
import { toExitErr } from './utils/err-catch'

const testCommand = 'NODE_ENV=test pnpm '
  + '--filter @vue-vine/compiler '
  + '--filter @vue-vine/e2e-test '
  + '--filter @vue-vine/eslint-parser '
  + '--filter @vue-vine/nuxt '
  + 'run test --run'

runCommand(testCommand).catch(toExitErr)
