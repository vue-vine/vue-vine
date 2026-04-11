import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

const tsdownConfig: UserConfig = defineConfig({
  entry: {
    'index': './src/index.ts',
    'style-loader': './src/style-loader.ts',
  },
  deps: {
    neverBundle: [
      '@rspack/core',
    ]
  },
})
export default tsdownConfig
