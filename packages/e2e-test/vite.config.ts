import type { PluginOption } from 'vite'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import { VineVitePlugin } from 'vue-vine/vite'

// https://vitejs.dev/config/
export default defineConfig({
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
    Inspect(),
    VineVitePlugin() as PluginOption,
  ],
})
