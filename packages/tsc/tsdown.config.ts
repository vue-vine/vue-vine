import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

const tsdownConfig: UserConfig = defineConfig({
  // Because @volar/typescript used dynamic require
  format: 'cjs',
})
export default tsdownConfig
