import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: {
    'index': './src/index.ts',
    'vine-loader': './src/loaders/vine-loader.ts',
  },
  external: [
    '@lynx-js/rspeedy',
    '@rsbuild/core',
    '@vue-vine/compiler',
    '@vue-vine/runtime-lynx',
  ],
})

export default config
