import path from 'node:path'
import { defineConfig } from 'vite'
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  resolve: {
    conditions: ['dev'],
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
    },
  },
  plugins: [
    VineVitePlugin(),
  ],
})
