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
        // Banned some built-in rules that not compatible with Vine
        'prefer-template': 'off',

        // Essentials:
        'vue-vine/essentials-no-child-content': 'error',
        'vue-vine/essentials-no-dupe-else-if': 'error',
        'vue-vine/essentials-no-dupe-attributes': 'error',
        'vue-vine/essentials-no-v-for-key-on-child': 'error',
        'vue-vine/essentials-no-lifecycle-hook-after-await': 'error',

        // Formats:
        'vue-vine/format-prefer-template': 'error',
        'vue-vine/format-vine-component-name': 'error',
        'vue-vine/format-vine-macros-leading': 'error',
        'vue-vine/format-vine-expose-at-tail': 'error',
        'vue-vine/format-vine-style-indent': ['warn', { indent: 2 }],
        'vue-vine/format-vine-template': 'warn',
        'vue-vine/format-html-self-closing': ['error', {
          html: {
            void: 'always',
            normal: 'always',
            component: 'always',
          },
          svg: 'always',
          math: 'always',
        }],
      },
    },
  ]
}

export default vueVineESLintConfigFactory
