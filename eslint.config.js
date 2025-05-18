import antfu from '@antfu/eslint-config'

export default antfu(
  {
    pnpm: true,
    ignores: [
      'node_modules',
      'dist',
      'pnpm-lock.yaml',

      'packages/docs/.vitepress/cache',
      'packages/e2e-test/**/*.vine.ts',
      'packages/playground',
      'packages/create-vue-vine/template/**/*',
      'packages/nuxt-module/playground/*',
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
      'packages/language-service/**/*.ts',
      'packages/language-server/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
)
