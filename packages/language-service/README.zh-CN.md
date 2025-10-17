# @vue-vine/language-service

[English](./README.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

[Vue Vine](https://vue-vine.dev) 的语言服务。

## 安装

```bash
npm install @vue-vine/language-service
```

## 使用

此包提供了 Vue Vine 的核心语言服务实现，包括虚拟代码生成和 TypeScript 插件。

```ts
import { createVueVineLanguage } from '@vue-vine/language-service'

const language = createVueVineLanguage(
  ts,
  compilerOptions,
  { target: 'extension' }
)
```

## 许可证

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/language-service?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/language-service
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/language-service?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/language-service
