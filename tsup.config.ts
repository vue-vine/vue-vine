import process from 'node:process'
import { defineConfig } from 'tsup'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  sourcemap: isDev,
  minify: !isDev,
  splitting: true,
  clean: true,
  dts: true,
  esbuildOptions(options) {
    options.conditions = ['dev']
  },
})
