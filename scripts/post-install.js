// If `packages/eslint-parser/dist` is not present,
// run `pnpm --filter @vue-vine/eslint-parser run build"

import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import url from 'node:url'
import { log } from '@baiwusanyu/utils-log'
import { cliExec } from './utils'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

async function buildESLintParser() {
  const distDir = resolve(__dirname, '../packages/eslint-parser/dist')
  const isDistDirExists = await fs.stat(distDir).then(() => true).catch(() => false)
  if (isDistDirExists) {
    log('info', '\nVue Vine ESLint parser has already been built.\n')
    return
  }

  cliExec('pnpm --filter @vue-vine/eslint-parser run build')
}

buildESLintParser()
