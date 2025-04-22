import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { log } from '@baiwusanyu/utils-log'

const commitRE
      // eslint-disable-next-line regexp/no-unused-capturing-group
      = /^(revert: )?(feat|fix|docs|refactor|perf|test|workflow|build|ci|chore|types|wip|release)(\(.+\))?!?: .{1,50}/

const __dirname = dirname(fileURLToPath(import.meta.url))
const msgPath = join(__dirname, '..', '.git', 'COMMIT_EDITMSG')

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
  feat(module): add new feature
  fix: fix a bug
`)
    process.exit(1)
  }
}

runCommitMsgHook()
