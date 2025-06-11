import type { UserConfig, UserConfigFn } from 'tsdown'
import { defineConfig } from 'tsdown'

const config: UserConfig | UserConfigFn = defineConfig({
  tsconfig: 'tsconfig.build.json',
})

export default config
