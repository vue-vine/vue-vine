import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

const tsdownConfig: UserConfig = defineConfig({
  entry: {
    index: './src/index.ts',
    vite: './src/vite/index.ts',
    rspack: './src/rspack/index.ts',
    rsbuild: './src/rsbuild/index.ts',
    slidev: './src/slidev/index.ts',
  },
  external: [
    '@vue-vine/vite-plugin',
    '@vue-vine/rspack-loader',
    'vue',
  ],
})
export default tsdownConfig
