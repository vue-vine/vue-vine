import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    vineLoader: './src/vineLoader.ts',
  },
  external: [
    '@lynx-js/rspeedy',
    '@rsbuild/core',
    '@vue-vine/compiler',
    '@vue-vine/runtime-lynx',
  ],
})

