# @vue-vine/compiler

[English](./README.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

[Vue Vine](https://vue-vine.dev) 的编译器。

## 安装

```bash
npm install @vue-vine/compiler
```

## 使用

```ts
import { compileVineTypeScriptFile } from '@vue-vine/compiler'

const { errors, vineCompFns } = compileVineTypeScriptFile(
  fileContent,
  fileId
)
```

## 许可证

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/compiler?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/compiler
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/compiler?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/compiler
