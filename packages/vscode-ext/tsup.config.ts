import { createRequire } from 'node:module'
import { defineConfig } from 'tsup'
import base from '../../tsup.config'

const require = createRequire(import.meta.url)

export default defineConfig(
  [
    {
      ...base,
      entry: {
        client: './src/index.ts',
        server: './node_modules/@vue-vine/language-server/bin/vue-vine-language-server.js',
      },
      format: 'cjs',
      external: [
        'vscode',
      ],
      splitting: false,
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
    {
      ...base,
      entry: ['src/typescript-plugin.ts'],
      outDir: './node_modules/@vue-vine/typescript-plugin',
    },
  ],
)
