import type { Linter } from 'eslint'
import VueVineESLintPlugin, { vineParser } from '@vue-vine/eslint-plugin'

function vueVineESLintConfigFactory(): Linter.Config[] {
  return [
    {
      files: ['**/*.vine.ts'],
      plugins: {
        'vue-vine': VueVineESLintPlugin,
      },
      languageOptions: {
        parser: vineParser,
      },
      rules: {
        'vue-vine/component-name-not-html-builtin': 'error',
        'vue-vine/format-vine-macros-leading': 'error',
        'vue-vine/format-vine-style-indent': ['warn', { indent: 2 }],
        'vue-vine/format-vine-template': 'warn',
      },
    },
  ]
}

export default vueVineESLintConfigFactory
