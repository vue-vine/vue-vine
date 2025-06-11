import type { UserConfig, UserConfigFn } from 'tsdown'
import { defineConfig } from 'tsdown'

const config: UserConfig | UserConfigFn = defineConfig({
  tsconfig: 'tsconfig.build.json',
  dts: {
    tsgo: true,
  },
})

export default config
