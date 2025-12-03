import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: {
    'index': './src/index.ts',
    'entry-main': './src/entry-main.ts',
    'entry-background': './src/entry-background.ts',
  },
  external: [
    '@vue/runtime-core',
    '@lynx-js/types',
  ],
})

export default config
