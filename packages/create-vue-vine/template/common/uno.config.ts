// uno.config.ts
import { defineConfig, presetIcons, presetUno } from 'unocss'

export default defineConfig({
  // ...UnoCSS options
  presets: [
    presetUno(),
    presetIcons(),
  ],
  content: {
    pipeline: {
      include: [
        'src/**/*.vine.ts',
      ],
    },
  },
})
