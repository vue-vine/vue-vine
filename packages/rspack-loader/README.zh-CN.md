# @vue-vine/rspack-loader

[English](./README.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

[Vue Vine](https://vue-vine.dev) 的 Rspack 加载器。

> TIPS: 🧪 Beta 功能
> Rspack 支持目前处于 **beta** 阶段。
>
> 请安装 beta 版本并[报告您遇到的任何问题](https://github.com/vue-vine/vue-vine/issues)。

## 安装

```bash
pnpm add -D @vue-vine/rspack-loader@beta
```

## 使用

> **注意**：对于大多数用户，我们推荐使用 [Rsbuild 插件](https://www.npmjs.com/package/@vue-vine/rsbuild-plugin)，它提供了更简单、更高层次的集成方式。仅在需要细粒度控制 loader 配置时才直接使用此 loader。

在 `rspack.config.ts` 中配置 loader：

```ts
import { defineConfig } from '@rspack/cli'
import { rspack } from '@rspack/core'

// 目标浏览器配置，用于代码转译
const targets = ['last 2 versions', '> 0.2%', 'not dead']

export default defineConfig({
  module: {
    rules: [
      // 使用链式 loader 处理 .vine.ts 文件
      // Loader 从右到左（从下到上）执行：
      // 1. @vue-vine/rspack-loader：将 Vine 组件转换为 TypeScript
      // 2. builtin:swc-loader：将 TypeScript 转换为 JavaScript
      {
        test: /\.vine\.ts$/,
        resourceQuery: { not: [/vine-style/] }, // 排除样式虚拟模块
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
      // 处理 Vine 样式虚拟模块
      {
        resourceQuery: /vine-style/,
        use: [
          {
            loader: '@vue-vine/rspack-loader/style-loader',
          },
        ],
        type: 'css',
      },
      // ...其他 rules
    ],
  },
  plugins: [
    // Vue 运行时所需
    new rspack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
  ],
})
```

### 为什么需要链式 loader？

Vine 编译器输出的是 TypeScript 代码，需要转换为 JavaScript。Rspack 内置的 `builtin:swc-loader` 用于进行 TypeScript 到 JavaScript 的转换，通过 Rust 原生实现提供了卓越的性能。

`resourceQuery: { not: [/vine-style/] }` 确保 Vine 样式块中的 CSS 内容不会被 TypeScript/JavaScript loader 处理。

## 许可证

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/rspack-loader?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/rspack-loader
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/rspack-loader?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/rspack-loader
