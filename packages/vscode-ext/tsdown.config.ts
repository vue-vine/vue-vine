import type { Options } from 'tsdown'
import { createRequire } from 'node:module'
import process from 'node:process'
import { defineConfig } from 'tsdown'

const require = createRequire(import.meta.url)
const isDev = process.env.NODE_ENV === 'development'

const plugins: Options['plugins'] = [
  {
    name: 'umd2esm',
    resolveId: {
      filter: {
        id: /^(vscode-.*-languageservice|vscode-languageserver-types|jsonc-parser)$/,
      },
      handler(path, importer) {
        const pathUmdMay = require.resolve(path, { paths: [importer!] })
        // Call twice the replace is to solve the problem of the path in Windows
        let pathEsm = pathUmdMay
          .replace('/umd/', '/esm/')
          .replace('\\umd\\', '\\esm\\')

        if (pathEsm.includes('vscode-uri')) {
          pathEsm = pathEsm
            .replace('/esm/index.js', '/esm/index.mjs')
            .replace('\\esm\\index.js', '\\esm\\index.mjs')
        }

        return { id: pathEsm }
      },
    },
  },

  // Mock ts-morph dependency for '@vue-vine/compiler',
  // in order to decrease the bundle size, because VSCode extension
  // doesn't need ts-morph to analyze props
  {
    name: 'mock-ts-morph',
    load: {
      filter: {
        id: /^ts-morph$/,
      },
      handler() {
        return {
          code: `export default {}`,
          moduleType: 'js',
        }
      },
    },
  },
]

const sharedConfig: Partial<Options> = {
  format: 'cjs',
  external: ['vscode'],
  dts: false,
  minify: !isDev,
  sourcemap: isDev,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  plugins,
}

export default defineConfig(
  [
    {
      entry: {
        client: './src/index.ts',
        server: './node_modules/@vue-vine/language-server/src/index.ts',
      },
      ...sharedConfig,
    },
    // We need to generate this inside node_modules so VS Code can resolve it
    // Bundle src/typescript-plugin.cjs -> node_modules/@vue-vine/typescript-plugin/index.js
    {
      entry: {
        index: 'src/typescript-plugin.ts',
      },
      outDir: 'node_modules/@vue-vine/typescript-plugin',
      clean: false,
      ...sharedConfig,
    },
  ],
)
