import { defineConfig } from 'tsdown'

const tsdownConfig: ReturnType<typeof defineConfig> = defineConfig({
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
export default tsdownConfig
