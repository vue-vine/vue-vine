import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import { cleanDist, runTscOnFinished } from '../../scripts/rollup/plugins.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const isDev = process.env.NODE_ENV === 'development'
function outputFormat(format) {
  return {
    format,
    file: resolve(__dirname, `dist/index.${format === 'es' ? 'mjs' : 'js'}`),
    exports: 'auto',
    sourcemap: isDev,
  }
}

export default defineConfig({
  input: [
    resolve(__dirname, './index.ts'),
  ],
  output: [
    outputFormat('es'),
    outputFormat('cjs'),
  ],
  external: [
    'vite',
    '@babel/types',
    '@babel/parser',
    'estree-walker',
    'magic-string',
    '@vue/compiler-dom',
    'merge-source-map',
    'postcss',
    'postcss-selector-parser',
    'source-map-js',
  ],
  plugins: [
    esbuild({
      tsconfig: resolve(__dirname, 'tsconfig.json'),
      sourceMap: isDev,
      minify: !isDev,
      target: 'es2015',
    }),
    commonjs(),
    nodeResolve(),
    cleanDist(resolve(__dirname, 'dist')),
    runTscOnFinished(__dirname),
  ],
})
