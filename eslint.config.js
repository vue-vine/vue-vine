const antfu = require('@antfu/eslint-config').default
const VueVineESLintParser = require('@vue-vine/eslint-parser')

module.exports = antfu(
  {
    ignores: [
      'node_modules',
      'dist',
      'pnpm-lock.yaml',
      'scripts/*.sh',

      'packages/docs/.vitepress/cache',
      'packages/e2e-test/**/*.vine.ts',
      'packages/playground/**/*.vine.ts',
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
