import { createRequire } from 'node:module'
import { defineConfig } from 'tsup'

const require = createRequire(import.meta.url)

export default defineConfig(
  [
    {
      entry: {
        'dist/client': './src/index.ts',
        'dist/server': './node_modules/@vue-vine/language-server/bin/vue-vine-language-server.js',
        // We need to generate this inside node_modules so VS Code can resolve it
        'node_modules/@vue-vine/typescript-plugin/index': 'src/typescript-plugin.ts',
      },
      outDir: '.',
      format: 'cjs',
      external: ['vscode'],
      bundle: true,
      define: { 'process.env.NODE_ENV': '"production"' },
      esbuildPlugins: [
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
      ],
    },
  ],
)
