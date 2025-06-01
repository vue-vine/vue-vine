import fs from 'node:fs/promises'
import process from 'node:process'
import { log } from '@baiwusanyu/utils-log'
import { r, runCommand } from './utils'

async function buildESLintParser() {
  if (typeof process.stdin.setRawMode !== 'function') {
    return
  }

  const eslintParserDistDir = r('..', 'packages', 'eslint-parser', 'dist')
  const isESLintParserDistDirExists = await fs.stat(eslintParserDistDir).then(() => true).catch(() => false)

  const eslintPluginDistDir = r('..', 'packages', 'eslint-plugin', 'dist')
  const isESLintPluginDistDirExists = await fs.stat(eslintPluginDistDir).then(() => true).catch(() => false)

  const eslintConfigDistDir = r('..', 'packages', 'eslint-config', 'dist')
  const isESLintConfigDistDirExists = await fs.stat(eslintConfigDistDir).then(() => true).catch(() => false)

  if (
    isESLintParserDistDirExists
    && isESLintPluginDistDirExists
    && isESLintConfigDistDirExists
  ) {
    log('info', '\nVue Vine ESLint packages has already been built.\n')
    return
  }

  runCommand('pnpm run build:eslint')
}

buildESLintParser()
