import { defineConfig } from 'tsdown'

export default defineConfig({
  // Because @volar/typescript used dynamic require
  format: 'cjs',
})
