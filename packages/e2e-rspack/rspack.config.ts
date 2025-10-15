import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@rspack/cli'
import { rspack } from '@rspack/core'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Target browsers, see: https://github.com/browserslist/browserslist
const targets = ['last 2 versions', '> 0.2%', 'not dead', 'Firefox ESR']

export default defineConfig({
  entry: {
    main: './src/main.ts',
  },
  devServer: {
    port: 15080,
    hot: true,
    historyApiFallback: true,
  },
  resolve: {
    extensions: ['...', '.ts', '.vue'],
    alias: {
      '@': `${__dirname}/src`,
    },
  },
  module: {
    rules: [
      // Vine loader for .vine.ts files
      // Loaders execute from right to left (bottom to top)
      // 1. @vue-vine/rspack-loader: Transform Vine components to TypeScript Vue components
      // 2. builtin:swc-loader: Transform TypeScript to JavaScript
      {
        test: /\.vine\.ts$/,
        resourceQuery: { not: [/vine-style/] }, // Exclude style virtual modules
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
              },
              env: { targets },
            },
          },
          {
            loader: '@vue-vine/rspack-loader',
          },
        ],
      },
      // Vine style loader for virtual style modules
      {
        resourceQuery: /vine-style/,
        use: [
          {
            loader: '@vue-vine/rspack-loader/style-loader',
          },
        ],
        type: 'css',
      },
      {
        test: /\.(js|ts)$/,
        exclude: /\.vine\.ts$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
              },
              env: { targets },
            },
          },
        ],
      },
      {
        test: /\.s[ac]ss$/,
        use: [
          {
            loader: 'builtin:lightningcss-loader',
            options: { targets },
          },
          {
            loader: 'sass-loader',
          },
        ],
        type: 'css',
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp|ico)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
    new rspack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
  ],
  optimization: {
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin(),
      new rspack.LightningCssMinimizerRspackPlugin({
        minimizerOptions: { targets },
      }),
    ],
  },
  experiments: {
    css: true,
  },
})
