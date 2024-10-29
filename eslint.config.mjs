import { createRequire } from 'node:module'
import antfu from '@antfu/eslint-config'
import * as VueVineESLintParser from '@vue-vine/eslint-parser'

const require = createRequire(import.meta.url)
const VueVineESLintParserPackageJSON = require('@vue-vine/eslint-parser/package.json')

export default antfu(
  {
    ignores: [
      'node_modules',
      'dist',
      'pnpm-lock.yaml',
      'scripts/*.sh',

      'packages/docs/.vitepress/cache',
      'packages/e2e-test/**/*.vine.ts',
      'packages/playground/**/*.vine.ts',
      'packages/create-vue-vine/template/**/*.vine.[j|t]s',
    ],
  },
  {
    rules: {
      'curly': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: [
      'packages/e2e-test/**/*.vine.ts',
      'packages/playground/**/*.vine.ts',
      'packages/nuxt-module/playground/**/*.vine.ts',
    ],
    languageOptions: {
      parser: {
        meta: {
          name: '@vue-vine/eslint-parser',
          version: VueVineESLintParserPackageJSON.version,
        },
        ...VueVineESLintParser,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      'packages/language-service/**/*.ts',
      'packages/language-server/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
)
