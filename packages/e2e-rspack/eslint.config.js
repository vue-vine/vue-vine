// @ts-check

import antfu from '@antfu/eslint-config'
import VueVine from '@vue-vine/eslint-config'

export default antfu(
  {
    // Override Antfu's default settings
    vue: true,
  },
  {
    rules: {
      'curly': 'off',
      'prefer-const': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.vine.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  ...VueVine(),
)
