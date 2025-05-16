import { defineConfig } from 'tsdown'

export default defineConfig(
  {
    entry: {
      'index': 'src/index.ts',
      'typescript-plugin/index': 'typescript-plugin/index.ts',
    },
  },
)
