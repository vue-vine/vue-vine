import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

const tsdownConfig: UserConfig = defineConfig(
  {
    entry: {
      'index': 'src/index.ts',
      'typescript-plugin/index': 'typescript-plugin/index.ts',
    },
  },
)
export default tsdownConfig
