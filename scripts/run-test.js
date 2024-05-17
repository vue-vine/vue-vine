import * as process from 'node:process'
import { runCommand } from './utils'

const update = process.argv.includes('--update')

const testCommand = 'cross-env NODE_ENV=test '
  + `pnpm run test:compiler --run ${update ? '-u' : ''} && `
  + `pnpm run test:e2e --run && ${update ? '-u' : ''}`
  + `pnpm run test:eslint-parser --run ${update ? '-u' : ''}`

runCommand(testCommand)
