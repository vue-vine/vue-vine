# @vue-vine/vite-plugin

[English](./README.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

[Vue Vine](https://vue-vine.dev) 的官方 Vite 插件。

## 安装

```bash
npm install @vue-vine/vite-plugin
```

## 使用

在 `vite.config.ts` 中配置：

```ts
import { VineVitePlugin } from '@vue-vine/vite-plugin'

export default {
  plugins: [
    VineVitePlugin(),
  ],
}
```

或使用主包的便捷导出：

```ts
import { VineVitePlugin } from 'vue-vine/vite'

export default {
  plugins: [
    VineVitePlugin(),
  ],
}
```

## 许可证

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/vite-plugin?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/vite-plugin
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/vite-plugin?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/vite-plugin
