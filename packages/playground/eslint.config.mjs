import { createRequire } from 'node:module'
import antfu from '@antfu/eslint-config'
import * as VueVineESLintParser from '@vue-vine/eslint-parser'

const require = createRequire(import.meta.url)
const VueVineESLintParserPackageJSON = require('@vue-vine/eslint-parser/package.json')

export default antfu(
  {
    // Override Antfu's default settings
    vue: true,
  },
  {
    rules: {
      'curly': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: [
      'src/**/*.vine.ts',
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
)
