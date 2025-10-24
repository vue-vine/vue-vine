import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

const tsdownConfig: UserConfig = defineConfig({
  entry: {
    index: './src/index.ts',
  },
  external: [
    '@rsbuild/core',
    '@rspack/core',
  ],
})
export default tsdownConfig
