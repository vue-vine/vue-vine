import type { RsbuildConfig } from '@rsbuild/core'
import process from 'node:process'
import { defineConfig } from '@rsbuild/core'
import { pluginSass } from '@rsbuild/plugin-sass'
import { pluginVueVine } from '@vue-vine/rsbuild-plugin'

const config: RsbuildConfig = defineConfig({
  // Entry point configuration
  source: {
    entry: {
      index: './src/main.ts',
    },
  },

  // HTML template
  html: {
    template: './index.html',
  },

  // Dev server configuration
  server: {
    port: 15080,
    historyApiFallback: true,
  },

  // Avoid overwritten by NODE_ENV=test
  mode: 'development',
  dev: {
    progressBar: process.env.NODE_ENV !== 'test',
  },

  // Path resolution
  resolve: {
    alias: {
      '@': './src',
    },
  },

  // Plugins
  plugins: [
    pluginVueVine(),
    pluginSass(),
  ],
})

export default config
