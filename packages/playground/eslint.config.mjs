import { createRequire } from 'node:module'
import antfu from '@antfu/eslint-config'
import * as VueVineESLintParser from '@vue-vine/eslint-parser'
import VueVineESLintPlugin from '@vue-vine/eslint-plugin'

const require = createRequire(import.meta.url)
const VueVineESLintParserPackageJSON = require('@vue-vine/eslint-parser/package.json')

export default antfu(
  {
    // Override Antfu's default settings
    vue: true,
    stylistic: false,
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
    plugins: {
      'vue-vine': VueVineESLintPlugin,
    },
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
      'vue-vine/format-vine-style-indent': [
        'error',
        { indent: 2 },
      ],
    },
  },
)
