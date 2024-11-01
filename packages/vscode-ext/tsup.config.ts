import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { defineConfig } from 'tsup'

const require = createRequire(import.meta.url)
const isDev = process.env.NODE_ENV === 'development'

export default defineConfig(
  [
    {
      entry: {
        client: './src/index.ts',
        server: './node_modules/@vue-vine/language-server/bin/vue-vine-language-server.js',
      },
      format: 'cjs',
      external: ['vscode'],
      minify: false,
      bundle: true,
      sourcemap: isDev,
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
        // We need to generate this inside node_modules so VS Code can resolve it
        // Copy src/typescript-plugin.cjs -> node_modules/@vue-vine/typescript-plugin/index.js
        {
          name: 'copy-typescript-plugin',
          setup(build) {
            build.onEnd(() => {
              const src = path.resolve(__dirname, 'src/typescript-plugin.cjs')
              const dest = path.resolve(__dirname, 'node_modules/@vue-vine/typescript-plugin/index.js')
              fs.copyFileSync(src, dest)
            })
          },
        },
      ],
    },
  ],
)
