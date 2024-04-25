// uno.config.ts
import { defineConfig, presetIcons, presetUno, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
      unit: 'em',
    }),
  ],
  transformers: [
    transformerVariantGroup(),
  ],
  shortcuts: {
    'recommendation-bg': 'group-hover:(blur-md op100) op0 transition-opacity top-10% left-15% absolute rounded-50% w-75% h-75%',
  },
})
