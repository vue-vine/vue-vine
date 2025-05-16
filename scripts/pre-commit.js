import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { log } from '@baiwusanyu/utils-log'

const commitRE = /^(?:revert: )?(?:feat|fix|docs|refactor|perf|test|workflow|build|ci|chore|types|wip|release)(?:\(.+\))?!?: .{1,50}/

const msgPath = join(import.meta.dirname, '..', '.git', 'COMMIT_EDITMSG')

if (!msgPath) {
  log('error', 'Error: No commit message file path provided.')
  process.exit(1)
}

async function runCommitMsgHook() {
  const msg = readFileSync(msgPath, 'utf-8').trim()

  if (!commitRE.test(msg)) {
    log('error', `
Error: Commit message format does not meet the requirements.

Please follow the commitlint format, for example:
  feat(module): message less than 50 characters
  fix: message less than 50 characters
`)
    process.exit(1)
  }
}

runCommitMsgHook()
