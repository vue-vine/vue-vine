import { defineConfig } from 'tsup'
import base from '../../tsup.config'

export default defineConfig({
  ...base,
  external: [
    '@babel/types',
    '@babel/parser',
    'estree-walker',
    'magic-string',
    '@vue/compiler-dom',
    'merge-source-map',
    'postcss',
    'postcss-selector-parser',
    'source-map-js',
  ],
})
