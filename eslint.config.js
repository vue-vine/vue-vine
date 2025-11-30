import antfu from '@antfu/eslint-config'

export default antfu(
  {
    pnpm: true,
    ignores: [
      'node_modules',
      'dist',
      'pnpm-lock.yaml',
      '.research',

      'packages/docs/.vitepress/cache',
      'packages/e2e-vite/**/*.vine.ts',
      'packages/e2e-rsstack/**/*.vine.ts',
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
      'packages/e2e-rsstack/tests/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      'packages/e2e-lynx/**/*.ts',
      'packages/rspeedy-plugin-vue-vine/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
)
