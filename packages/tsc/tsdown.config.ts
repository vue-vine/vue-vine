import { defineConfig } from 'tsdown'

const tsdownConfig: ReturnType<typeof defineConfig> = defineConfig({
  // Because @volar/typescript used dynamic require
  format: 'cjs',
})
export default tsdownConfig
