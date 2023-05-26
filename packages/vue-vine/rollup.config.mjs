import { join } from 'node:path'
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import copy from 'rollup-plugin-copy'

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
  input: [
    './src/vite/index.ts',
  ],
  output: [
    outputFormat('es', './dist/vite'),
    outputFormat('cjs', './dist/vite'),
  ],
  ...sharedOptions,
  plugins: [
    typescript(),
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
  input: [
    './src/index.ts',
  ],
  output: [
    outputFormat('es', './dist'),
    outputFormat('cjs', './dist'),
  ],
  ...sharedOptions,
  plugins: [
    typescript(),
  ],
}

export default defineConfig([
  bundleForVite,
  bundleForIndex,
])
