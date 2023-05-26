import { resolve } from 'node:path'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import copy from 'rollup-plugin-copy'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function cleanDist() {
  return {
    name: 'cleanDist',
    buildStart() {
      const distPath = resolve(__dirname, 'dist')
      rmSync(distPath, { recursive: true, force: true })
    },
  }
}

const isDev = process.env.NODE_ENV === 'development'
function outputFormat(format) {
  return {
    format,
    file: `dist/index.${format === 'es' ? 'mjs' : 'js'}`,
    exports: 'auto',
    sourcemap: isDev,
  }
}

export default defineConfig({
  input: [
    './index.ts',
  ],
  output: [
    outputFormat('es'),
    outputFormat('cjs'),
  ],
  external: [
    'vite',
    'magic-string',
    '@ast-grep/napi',
    '@vue/compiler-dom',
  ],
  plugins: [
    typescript(),
    commonjs(),
    nodeResolve(),
    cleanDist(),
    copy({
      targets: [
        { src: 'types/macros.d.ts', dest: 'dist' },
      ],
    }),
  ],
})
