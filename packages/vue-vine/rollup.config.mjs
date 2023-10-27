import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'rollup'
import copy from 'rollup-plugin-copy'
import esbuild from 'rollup-plugin-esbuild'
import { runTscOnFinished } from '../../scripts/rollup/plugins.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const isDev = process.env.NODE_ENV === 'development'
function outputFormat(format, dir) {
  return {
    format,
    file: join(dir, `index.${format === 'es' ? 'mjs' : 'js'}`),
    exports: 'auto',
    sourcemap: isDev,
  }
}

const sharedOptions = {
  external: [
    '@vue-vine/vite-plugin',
    '@vueuse/core',
  ],
}

const bundleForVite = {
  input: resolve(__dirname, 'src/vite/index.ts'),
  output: [
    outputFormat('es', resolve(__dirname, 'dist/vite')),
    outputFormat('cjs', resolve(__dirname, 'dist/vite')),
  ],
  ...sharedOptions,
  plugins: [
    esbuild({
      tsconfig: resolve(__dirname, 'tsconfig.json'),
      sourceMap: isDev,
      minify: !isDev,
      target: 'es2015',
    }),
    copy({
      targets: [
        {
          src: './src/vite/index.ts',
          dest: './dist/vite',
          rename: 'index.d.ts',
        },
      ],
    }),
  ],
}
const bundleForIndex = {
  input: resolve(__dirname, 'src/index.ts'),
  output: [
    outputFormat('es', resolve(__dirname, 'dist')),
    outputFormat('cjs', resolve(__dirname, 'dist')),
  ],
  ...sharedOptions,
  plugins: [
    esbuild({
      tsconfig: resolve(__dirname, 'tsconfig.json'),
      sourceMap: isDev,
      minify: !isDev,
      target: 'es2015',
    }),
    runTscOnFinished(__dirname),
  ],
}

export default defineConfig([
  bundleForVite,
  bundleForIndex,
])
