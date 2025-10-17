# @vue-vine/language-service

[中文文档](./README.zh-CN.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

Language service for [Vue Vine](https://vue-vine.dev).

## Installation

```bash
npm install @vue-vine/language-service
```

## Usage

This package provides the core language service implementation for Vue Vine, including virtual code generation and TypeScript plugin.

```ts
import { createVueVineLanguage } from '@vue-vine/language-service'

const language = createVueVineLanguage(
  ts,
  compilerOptions,
  { target: 'extension' }
)
```

## License

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/language-service?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/language-service
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/language-service?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/language-service
