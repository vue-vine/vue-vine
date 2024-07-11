import antfu from '@antfu/eslint-config'
import * as VueVineESLintParser from '@vue-vine/eslint-parser'

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
    ],
    languageOptions: {
      parser: VueVineESLintParser,
    },
    rules: {
      'no-console': 'off',
    },
  },
)
