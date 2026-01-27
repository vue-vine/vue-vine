# @vue-vine/rsbuild-plugin

[中文文档](./README.zh-CN.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

Rsbuild plugin for [Vue Vine](https://vue-vine.dev).

## Installation

```bash
pnpm add -D @vue-vine/rsbuild-plugin
```

## Usage

Use the plugin in `rsbuild.config.ts`:

```ts
import { defineConfig } from '@rsbuild/core'
import { pluginVueVine } from 'vue-vine/rsbuild'

export default defineConfig({
  plugins: [
    pluginVueVine({
      // Optional compiler options
      // compilerOptions: { ... }
    })
  ],
})
```

### Why use the plugin?

The Rsbuild plugin provides a simpler, higher-level integration compared to the Rspack loader. It automatically:
- Configures the necessary loaders for `.vine.ts` files
- Sets up style processing rules
- Injects Vue runtime flags via DefinePlugin

For advanced users who need fine-grained control over loader configuration, you can still use the [Rspack loader](https://www.npmjs.com/package/@vue-vine/rspack-loader) directly.

## License

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/rsbuild-plugin?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/rsbuild-plugin
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/rsbuild-plugin?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/rsbuild-plugin
