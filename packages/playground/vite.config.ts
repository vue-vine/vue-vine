import path from 'node:path'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import MagicString from 'magic-string'
import vue from '@vitejs/plugin-vue'
import { VineVitePlugin } from 'vue-vine/vite'
import AutoImport from 'unplugin-auto-import/vite'
import UnoCSS from 'unocss/vite'

let content = ''
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
   /* {
      name: 'test',
      resolveId(id) {
        if (id.includes('test.css')) {
          return '/Users/baiwusanyu/WebstormProjects/vue-vine/packages/playground/src/main.ts?ts&type=style&index=0&scoped=7a7a37b1&lang.css'
        }
      },
      load(id) {
        if (id.endsWith('lang.css')) {
          return content
        }
      },
      transform(code, id) {
        if (id.includes('test.css')) {
          return
        }
        if (id.endsWith('main.ts')) {
          content = code.split('#')[1]
          const mgcStr = new MagicString(code)
          mgcStr.appendLeft(0, 'import \'test.css\'\n')
          return {
            code: mgcStr.toString(),
            map: mgcStr.generateMap({
              includeContent: true,
              hires: true,
            }),
          }
        }
        return code
      },
    },*/
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
