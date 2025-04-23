import { defineConfig } from 'tsup'
import base from '../../tsup.config'

export default defineConfig([
  {
    ...base,
    entry: ['src/index.ts'],
    outDir: './dist',
  },
  {
    ...base,
    entry: ['typescript-plugin/index.ts'],
    outDir: './dist/typescript-plugin',
  },
])
