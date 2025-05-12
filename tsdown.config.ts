import { join } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'tsdown'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: true,
  sourcemap: isDev,
  tsconfig: join(import.meta.dirname, 'tsconfig.json'),
})
