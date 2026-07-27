import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

const tsdownConfig: UserConfig = defineConfig({
  deps: {
    neverBundle: [
      'vite',
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
  },
})
export default tsdownConfig
