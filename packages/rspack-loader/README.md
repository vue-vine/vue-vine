# @vue-vine/rspack-loader

[中文文档](./README.zh-CN.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

Rspack loader for [Vue Vine](https://vue-vine.dev).

> TIPS: 🧪 Beta Feature
> Rspack support is currently in **beta**.
>
> Please install the beta version and [report any issues](https://github.com/vue-vine/vue-vine/issues) you encounter.

## Installation

```bash
pnpm add -D @vue-vine/rspack-loader@beta
```

## Usage

> **Note**: For most users, we recommend using the [Rsbuild plugin](https://www.npmjs.com/package/@vue-vine/rsbuild-plugin) which provides a simpler, higher-level integration. Use this loader directly only if you need fine-grained control over loader configuration.

Configure the loader in `rspack.config.ts`:

```ts
import { defineConfig } from '@rspack/cli'
import { rspack } from '@rspack/core'

// Target browsers for transpilation
const targets = ['last 2 versions', '> 0.2%', 'not dead']

export default defineConfig({
  module: {
    rules: [
      // Process .vine.ts files with chained loaders
      // Loaders execute from right to left (bottom to top):
      // 1. @vue-vine/rspack-loader: Transforms Vine components to TypeScript
      // 2. builtin:swc-loader: Transforms TypeScript to JavaScript
      {
        test: /\.vine\.ts$/,
        resourceQuery: { not: [/vine-style/] }, // Exclude style virtual modules
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: { syntax: 'typescript' },
              },
              env: { targets },
            },
          },
          {
            loader: '@vue-vine/rspack-loader',
          },
        ],
      },
      // Process Vine style virtual modules
      {
        resourceQuery: /vine-style/,
        use: [
          {
            loader: '@vue-vine/rspack-loader/style-loader',
          },
        ],
        type: 'css',
      },
      // ...other rules
    ],
  },
  plugins: [
    // Required for Vue runtime
    new rspack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
  ],
})
```

### Why chained loaders?

The Vine compiler outputs TypeScript code that needs to be transformed to JavaScript. Rspack's built-in `builtin:swc-loader` is used for this TypeScript-to-JavaScript transformation, providing excellent performance through native Rust implementation.

The `resourceQuery: { not: [/vine-style/] }` ensures that CSS content from Vine style blocks isn't processed by the TypeScript/JavaScript loaders.

## License

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/rspack-loader?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/rspack-loader
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/rspack-loader?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/rspack-loader
