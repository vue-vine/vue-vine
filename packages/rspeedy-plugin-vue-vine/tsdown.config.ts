import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: {
    index: './src/index.ts',
  },
  external: [
    '@lynx-js/rspeedy',
    '@rsbuild/core',
  ],
})

export default config
