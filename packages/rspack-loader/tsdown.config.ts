import { defineConfig } from 'tsdown'

const tsdownConfig: ReturnType<typeof defineConfig> = defineConfig({
  entry: {
    'index': './src/index.ts',
    'style-loader': './src/style-loader.ts',
  },
  external: [
    '@rspack/core',
  ],
})
export default tsdownConfig
