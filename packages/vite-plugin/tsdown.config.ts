import { defineConfig } from 'tsdown'

export default defineConfig({
  external: [
    'vite',
    '@babel/types',
    '@babel/parser',
    'estree-walker',
    'magic-string',
    '@vue/compiler-dom',
    'merge-source-map',
    'postcss',
    'postcss-selector-parser',
  ],
})
