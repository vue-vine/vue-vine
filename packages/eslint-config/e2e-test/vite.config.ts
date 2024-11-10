import type { PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VineVitePlugin } from 'vue-vine/vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3131,
  },
  plugins: [
    vue(),
    VineVitePlugin() as PluginOption,
  ],
})
