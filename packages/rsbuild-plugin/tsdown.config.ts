import { defineConfig } from 'tsdown'

const tsdownConfig: ReturnType<typeof defineConfig> = defineConfig({
  entry: {
    index: './src/index.ts',
  },
  external: [
    '@rsbuild/core',
    '@rspack/core',
  ],
})
export default tsdownConfig
