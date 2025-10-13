import { defineConfig } from 'tsdown'

const tsdownConfig: ReturnType<typeof defineConfig> = defineConfig({
  entry: {
    index: './src/index.ts',
    vite: './src/vite/index.ts',
    rspack: './src/rspack/index.ts',
    slidev: './src/slidev/index.ts',
  },
  external: [
    '@vue-vine/vite-plugin',
    '@vue-vine/rspack-loader',
    'vue',
  ],
})
export default tsdownConfig
