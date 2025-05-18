import { defineConfig } from 'tsdown'

const tsdownConfig: ReturnType<typeof defineConfig> = defineConfig(
  {
    entry: {
      'index': 'src/index.ts',
      'typescript-plugin/index': 'typescript-plugin/index.ts',
    },
  },
)
export default tsdownConfig
