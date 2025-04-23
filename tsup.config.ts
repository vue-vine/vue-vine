import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsup'

const isDev = process.env.NODE_ENV === 'development'
const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  sourcemap: isDev,
  minify: false,
  splitting: true,
  clean: true,
  dts: true,
  tsconfig: join(__dirname, 'tsconfig.lib.json'),
  esbuildOptions(options) {
    options.conditions = ['dev']
  },
})
