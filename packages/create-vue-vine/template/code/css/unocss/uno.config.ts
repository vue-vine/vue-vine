import { defineConfig, presetWind4 } from 'unocss'

export default defineConfig({
  // You can delete the file when unocss supports this by default
  content: {
    pipeline: {
      include: ['**/*.vine.ts'],
    },
  },
  presets: [
    presetWind4(),
  ],
})
