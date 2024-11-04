import type { Linter } from 'eslint'
import * as VueVineESLintParser from '@vue-vine/eslint-parser'
import VueVineESLintPlugin from '@vue-vine/eslint-plugin'

function vueVineESLintConfigFactory(): Linter.Config[] {
  return [
    {
      files: ['**/*.vine.ts'],
      plugins: {
        'vue-vine': VueVineESLintPlugin,
      },
      languageOptions: {
        parser: VueVineESLintParser,
      },
      rules: {
        'vue-vine/format-vine-style-indent': ['error', { indent: 2 }],
        'vue-vine/format-vine-macros-leading': 'error',
      },
    },
  ]
}

export default vueVineESLintConfigFactory
