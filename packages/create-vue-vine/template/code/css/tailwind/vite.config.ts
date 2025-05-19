import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VineVitePlugin } from 'vue-vine/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    VineVitePlugin(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
