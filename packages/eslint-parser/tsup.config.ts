import { defineConfig } from 'tsup'
import base from '../../tsup.config'

export default defineConfig({
  ...base,
  external: [
    '@babel/types',
    '@babel/parser',
    'eslint-scope',
    'espree',
    'line-column',
    'semver',
    '@typescript-eslint/parser',
    '@typescript-eslint/scope-manager',
    '@typescript-eslint/typescript-estree',
    'lodash/sortedIndexBy',
    'lodash/sortedLastIndexBy',
    'lodash/first',
    'lodash/last',
  ],
})
