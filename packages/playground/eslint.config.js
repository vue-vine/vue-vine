// @ts-check

import antfu from '@antfu/eslint-config'
import VueVine from '@vue-vine/eslint-config'

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
    files: ['src/**/*.vine.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  ...VueVine(),
)
