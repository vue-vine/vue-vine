// uno.config.ts
import { defineConfig, presetIcons, presetUno, transformerDirectives, transformerVariantGroup } from 'unocss'

const unoConfig: ReturnType<typeof defineConfig> = defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
      unit: 'em',
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  shortcuts: {
    'recommendation-bg': 'group-hover:(blur-md op100) op0 transition-opacity top-10% left-15% absolute rounded-50% w-75% h-75%',
  },
})
export default unoConfig
