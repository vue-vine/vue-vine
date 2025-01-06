import { readFileSync } from 'node:fs'
import process from 'node:process'
import { log } from '@baiwusanyu/utils-log'
import { r } from './utils'

const msgPath = r('..', '.git', 'COMMIT_EDITMSG')
const commitRE
      // eslint-disable-next-line regexp/no-unused-capturing-group
      = /^(revert: )?(feat|fix|docs|refactor|perf|test|workflow|build|ci|chore|types|wip|release)(\(.+\))?: .{1,50}/

async function runPreCommit() {
  const msg = readFileSync(msgPath, 'utf-8').trim()
  if (!commitRE.test(msg)) {
    log('error', 'Error: Git commit message must follow standard format!')
    process.exit(1)
  }
}

runPreCommit()
