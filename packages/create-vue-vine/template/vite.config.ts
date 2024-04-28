import path from 'node:path'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import { VineVitePlugin } from 'vue-vine/vite'
import AutoImport from 'unplugin-auto-import/vite'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  resolve: {
    conditions: ['dev'],
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
    },
  },
  plugins: [
    VineVitePlugin(),
    Inspect(),
    UnoCSS(),
    AutoImport({
      imports: [
        'vue',
        '@vueuse/core',
      ],
      dts: 'src/auto-imports.d.ts',
    }),
  ],
})
