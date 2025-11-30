import { defineConfig } from 'tsdown'

const tsdownConfig: ReturnType<typeof defineConfig> = defineConfig({
  entry: {
    index: './src/index.ts',
  },
  external: [
    'vue',
    '@lynx-js/types',
  ],
})

export default tsdownConfig

