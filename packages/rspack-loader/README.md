# @vue-vine/rspack-loader

[中文文档](./README.zh-CN.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

Rspack loader for [Vue Vine](https://vue-vine.dev).

## Installation

```bash
npm install @vue-vine/rspack-loader
```

## Usage

Configure in your `rspack.config.js`:

```js
import { VueVinePlugin } from 'vue-vine/rspack'

export default {
  plugins: [
    VueVinePlugin(),
  ],
}
```

## License

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/rspack-loader?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/rspack-loader
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/rspack-loader?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/rspack-loader
