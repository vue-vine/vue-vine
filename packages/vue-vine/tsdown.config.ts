import { defineConfig } from 'tsdown'
import base from '../../tsdown.config.ts'

export default defineConfig({
  ...base,
  entry: {
    index: './src/index.ts',
    vite: './src/vite/index.ts',
  },
  external: [
    '@vue-vine/vite-plugin',
    'vue',
  ],
})
