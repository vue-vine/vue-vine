// uno.config.ts
import { defineConfig, presetIcons, presetWind3 } from 'unocss'

export default defineConfig({
  // ...UnoCSS options
  presets: [
    presetWind3(),
    presetIcons(),
  ],
  content: {
    pipeline: {
      include: [
        'src/**/*.vine.ts',
      ],
    },
  },
  shortcuts: {
    'col-flex': 'flex flex-col',
    'row-flex': 'flex flex-row items-center',
  },
})
