import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import url from 'node:url'
import { log } from '@baiwusanyu/utils-log'
import { cliExec } from './utils'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

async function buildESLintParser() {
  if (typeof process.stdin.setRawMode !== 'function') {
    return
  }

  const eslintParserDistDir = resolve(__dirname, '..', 'packages', 'eslint-parser', 'dist')
  const isESLintParserDistDirExists = await fs.stat(eslintParserDistDir).then(() => true).catch(() => false)

  const eslintPluginDistDir = resolve(__dirname, '..', 'packages', 'eslint-plugin', 'dist')
  const isESLintPluginDistDirExists = await fs.stat(eslintPluginDistDir).then(() => true).catch(() => false)

  const eslintConfigDistDir = resolve(__dirname, '..', 'packages', 'eslint-config', 'dist')
  const isESLintConfigDistDirExists = await fs.stat(eslintConfigDistDir).then(() => true).catch(() => false)

  if (
    isESLintParserDistDirExists
    && isESLintPluginDistDirExists
    && isESLintConfigDistDirExists
  ) {
    log('info', '\nVue Vine ESLint packages has already been built.\n')
    return
  }

  cliExec('pnpm run build:eslint')
}

buildESLintParser()
