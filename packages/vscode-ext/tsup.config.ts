import { createRequire } from 'node:module'
import process from 'node:process'
import { defineConfig, type Options } from 'tsup'

const require = createRequire(import.meta.url)
const isDev = process.env.NODE_ENV === 'development'

const esbuildPlugins: Options['esbuildPlugins'] = [
  {
    name: 'umd2esm',
    setup(build) {
      build.onResolve({ filter: /^(vscode-.*|estree-walker|jsonc-parser)/ }, (args) => {
        const pathUmdMay = require.resolve(args.path, { paths: [args.resolveDir] })
        // Call twice the replace is to solve the problem of the path in Windows
        let pathEsm = pathUmdMay
          .replace('/umd/', '/esm/')
          .replace('\\umd\\', '\\esm\\')

        if (pathEsm.includes('vscode-uri')) {
          pathEsm = pathEsm
            .replace('/esm/index.js', '/esm/index.mjs')
            .replace('\\esm\\index.js', '\\esm\\index.mjs')
        }

        return { path: pathEsm }
      })
    },
  },

  // Mock ts-morph dependency for '@vue-vine/compiler',
  // in order to decrease the bundle size, because VSCode extension
  // doesn't need ts-morph to analyze props
  {
    name: 'mock-ts-morph',
    setup(build) {
      build.onResolve({ filter: /^ts-morph$/ }, () => {
        return {
          path: 'ts-morph',
          namespace: 'mock-ts-morph',
        }
      })
      build.onLoad({ filter: /.*/, namespace: 'mock-ts-morph' }, () => {
        return {
          contents: 'export default {}',
          loader: 'js',
        }
      })
    },
  },
]
const sharedConfig: Partial<Options> = {
  format: 'cjs',
  external: ['vscode', 'typescript'],
  minify: !isDev,
  bundle: true,
  sourcemap: isDev,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  esbuildPlugins,
}

export default defineConfig(
  [
    {
      entry: {
        client: './src/index.ts',
        server: './node_modules/@vue-vine/language-server/bin/vue-vine-language-server.js',
      },
      ...sharedConfig,
      clean: true,
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
