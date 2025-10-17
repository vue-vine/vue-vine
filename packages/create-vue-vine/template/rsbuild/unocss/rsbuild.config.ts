import { defineConfig } from '@rsbuild/core'
import { pluginVueVine } from 'vue-vine/rsbuild'

export default defineConfig({
  source: {
    entry: {
      index: './src/main.ts',
    },
  },

  html: {
    template: './index.html',
  },

  server: {
    port: 5173,
    historyApiFallback: true,
  },

  resolve: {
    alias: {
      '@': './src',
    },
  },

  plugins: [
    pluginVueVine(),
  ],
})

