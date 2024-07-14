import { defineConfig } from 'tsup'
import base from '../../tsup.config'

export default defineConfig({
  ...base,
  // Because @volar/typescript used dynamic require
  format: 'cjs',
})
