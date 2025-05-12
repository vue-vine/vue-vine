import { defineConfig } from 'tsdown'
import base from '../../tsdown.config.ts'

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
