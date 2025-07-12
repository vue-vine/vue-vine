import type { PluginOption } from 'vite'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import vueJSX from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import { VineVitePlugin } from 'vue-vine/vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
  },
  server: {
    port: 3131,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  plugins: [
    vue(),
    UnoCSS(),
    vueJSX(),
    Inspect(),
    AutoImport({
      imports: [
        'vue',
        '@vueuse/core',
      ],
      dts: 'src/auto-imports.d.ts',
      dirs: [
        'src/components',
      ],
    }),
    VineVitePlugin({
      vueCompilerOptions: {
        isCustomElement: tag => tag.startsWith('vi-'),
      },
    }) as PluginOption,
  ],
})
