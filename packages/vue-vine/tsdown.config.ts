import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    vite: './src/vite/index.ts',
  },
  external: [
    '@vue-vine/vite-plugin',
    'vue',
  ],
})
