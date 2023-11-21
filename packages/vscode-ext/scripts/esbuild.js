const process = require('node:process')

/** @type {import('esbuild').BuildOptions} */
const buildBaseOptions = {
  entryPoints: {
    client: './src/extension.ts',
    server: './node_modules/@vue-vine/language-server/bin/vine-language-server.js',
  },
  bundle: true,
  outdir: './dist',
  external: [
    'vscode',
    ...process.env.NODE_ENV === 'production'
      ? ['@vue-vine/compiler'] // In production, we use the `@vue-vine/compiler` installed under `node_modules`
      : [],
  ],
  format: 'cjs',
  platform: 'node',
  tsconfig: './tsconfig.json',
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: process.argv.includes('--metafile'),
  plugins: [
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
            pathEsm = pathEsm.replace('/esm/index.js', '/esm/index.mjs')
          }

          return { path: pathEsm }
        })
      },
    },
  ],
}

function commonExitHandler() {
  process.exit(1)
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    require('esbuild').build({
      ...buildBaseOptions,
      // Production config
      ...{
      // minify: process.argv.includes('--minify'),
      },
    }).catch(commonExitHandler)
  }
  else {
    try {
      const ctx = await require('esbuild').context({
        ...buildBaseOptions,
        // Development config
        ...{
        // ... To be supplemented
        },
      })
      await ctx.watch()
    }
    catch {
      commonExitHandler()
    }
  }
}

main()
