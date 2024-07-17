// uno.config.ts
import { defineConfig, presetIcons, presetUno, transformerDirectives, transformerVariantGroup } from 'unocss'

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
    transformerDirectives(),
  ],
  shortcuts: {
    'recommendation-bg': 'group-hover:(blur-md op100) op0 transition-opacity top-10% left-15% absolute rounded-50% w-75% h-75%',
  },
})
