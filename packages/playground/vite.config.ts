import type { SassPreprocessorOptions } from 'vite'
import path from 'node:path'
import vueJSX from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import { VineVitePlugin } from 'vue-vine/vite'

const configForSassAndScss = {
  api: 'modern-compiler',
  silenceDeprecations: [
    'legacy-js-api',
  ],
}

export default defineConfig({
  build: {
    minify: false,
  },
  css: {
    preprocessorOptions: {
      sass: configForSassAndScss as SassPreprocessorOptions,
      scss: configForSassAndScss as SassPreprocessorOptions,
    },
  },
  resolve: {
    conditions: ['vine'],
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
    },
  },
  plugins: [
    VineVitePlugin({
      vueCompilerOptions: {
        transformNegativeBool: true
      }
    }),
    vueJSX(),
    Inspect(),
    UnoCSS(),
    AutoImport({
      imports: [
        'vue',
        '@vueuse/core',
      ],
      dirs: [
        'src/components',
      ],
      dts: 'src/auto-imports.d.ts',
    }),
  ],
})
