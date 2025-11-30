import type { Config } from '@lynx-js/rspeedy'
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin'
import { defineConfig } from '@lynx-js/rspeedy'
import { pluginVueVineLynx } from '@vue-vine/rspeedy-plugin-vue-vine'

const config: Config = defineConfig({
  plugins: [
    pluginQRCode({
      schema(url) {
        return `${url}?fullscreen=true`
      },
    }),
    pluginVueVineLynx({
      debug: true,
    }),
  ],
  source: {
    entry: {
      main: './src/index.ts',
    },
  },
})

export default config
