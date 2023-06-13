import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Inspect from 'vite-plugin-inspect'
import { VineVitePlugin } from 'vue-vine/vite'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  resolve: {
    conditions: ['dev'],
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
    },
  },
  plugins: [
    vue(),
    VineVitePlugin(),
    Inspect(),
    AutoImport({
      imports: [
        'vue',
        '@vueuse/core',
      ],
      dts: 'src/auto-imports.d.ts',
    }),
  ],
})
