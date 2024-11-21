import process from 'node:process'
import { runCommand } from './utils'

const testCommand = 'NODE_ENV=test pnpm '
  + '--filter @vue-vine/compiler '
  + '--filter @vue-vine/e2e-test '
  + '--filter @vue-vine/eslint-parser '
  + '--filter @vue-vine/nuxt '
  + 'run test --run'

runCommand(testCommand)
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
