import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: {
    index: './src/index.ts',
  },
  external: [
    '@lynx-js/rspeedy',
    '@rsbuild/core',
    '@vue-vine/compiler',
    '@vue-vine/runtime-lynx',
  ],
})

export default config
