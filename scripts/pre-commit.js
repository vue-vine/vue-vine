import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { log } from '@baiwusanyu/utils-log'

const commitRE = /^[a-z]+(?:\([a-z]+\))?:\s*.{1,100}$/i

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

Please follow the format: <word>: <message>
  - <word>: one English word (letters only)
  - colon followed by optional space
  - <message>: any characters, up to 100 characters

Examples:
  feat: add new feature
  fix: resolve issue
  docs: update documentation
`)
    process.exit(1)
  }
}

runCommitMsgHook()
