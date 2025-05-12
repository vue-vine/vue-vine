import { defineConfig } from 'tsdown'
import base from '../../tsdown.config.ts'

export default defineConfig({
  ...base,
  // Because @volar/typescript used dynamic require
  format: 'cjs',
})
