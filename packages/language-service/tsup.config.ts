import process from 'node:process'
import { defineConfig } from 'tsup'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: './dist',
    format: ['cjs', 'esm'],
    sourcemap: isDev,
    minify: false,
    splitting: true,
    clean: true,
    dts: true,
    esbuildOptions(options) {
      options.conditions = ['dev']
    },
  },
  {
    entry: ['typescript-plugin/index.ts'],
    outDir: './dist/typescript-plugin',
    format: ['cjs', 'esm'],
    sourcemap: isDev,
    minify: false,
    splitting: true,
    clean: true,
    dts: true,
    esbuildOptions(options) {
      options.conditions = ['dev']
    },
  },
])
