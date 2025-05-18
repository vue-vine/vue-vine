import { defineConfig } from 'tsdown'

const tsdownConfig: ReturnType<typeof defineConfig> = defineConfig({
  entry: {
    index: './src/index.ts',
    vite: './src/vite/index.ts',
  },
  external: [
    '@vue-vine/vite-plugin',
    'vue',
  ],
})
export default tsdownConfig
