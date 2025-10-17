# @vue-vine/rsbuild-plugin

[English](./README.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

[Vue Vine](https://vue-vine.dev) 的 Rsbuild 插件。

::: tip 🧪 Beta 功能
Rsbuild 支持目前处于 **beta** 阶段。

请安装 beta 版本并[报告您遇到的任何问题](https://github.com/vue-vine/vue-vine/issues)。
:::

## 安装

```bash
pnpm add -D @vue-vine/rsbuild-plugin@beta
```

## 使用

在 `rsbuild.config.ts` 中使用插件：

```ts
import { defineConfig } from '@rsbuild/core'
import { pluginVueVine } from 'vue-vine/rsbuild'

export default defineConfig({
  plugins: [
    pluginVueVine({
      // 可选的编译器选项
      // compilerOptions: { ... }
    })
  ],
})
```

### 为什么使用插件？

Rsbuild 插件相比 Rspack loader 提供了更简单、更高层次的集成方式。它会自动：
- 配置 `.vine.ts` 文件所需的 loader
- 设置样式处理规则
- 通过 DefinePlugin 注入 Vue 运行时标志

对于需要细粒度控制 loader 配置的高级用户，仍可以直接使用 [Rspack loader](https://www.npmjs.com/package/@vue-vine/rspack-loader)。

## 许可证

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/rsbuild-plugin?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/rsbuild-plugin
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/rsbuild-plugin?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/rsbuild-plugin
