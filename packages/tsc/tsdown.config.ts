import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

const tsdownConfig: UserConfig = defineConfig({
  dts: false,
  outputOptions: {
    // Because @volar/typescript used dynamic require
    format: 'cjs',
  },
})
export default tsdownConfig
