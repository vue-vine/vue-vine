import { defineConfig } from 'tsup'
import base from '../../tsup.config'

export default defineConfig({
  ...base,
  entry: {
    index: './src/index.ts',
    vite: './src/vite/index.ts',
  },
  external: [
    '@vue-vine/vite-plugin',
    '@vueuse/core',
  ],
})
