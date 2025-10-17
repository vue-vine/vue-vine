# @vue-vine/compiler

[中文文档](./README.zh-CN.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

Compiler for [Vue Vine](https://vue-vine.dev).

## Installation

```bash
npm install @vue-vine/compiler
```

## Usage

```ts
import { compileVineTypeScriptFile } from '@vue-vine/compiler'

const { errors, vineCompFns } = compileVineTypeScriptFile(
  fileContent,
  fileId
)
```

## License

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/compiler?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/compiler
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/compiler?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/compiler
