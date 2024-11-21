import path from 'node:path'
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
  css: {
    preprocessorOptions: {
      sass: configForSassAndScss,
      scss: configForSassAndScss,
    }
  },
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
