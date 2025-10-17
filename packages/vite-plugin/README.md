# @vue-vine/vite-plugin

[中文文档](./README.zh-CN.md)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

Official Vite plugin for [Vue Vine](https://vue-vine.dev).

## Installation

```bash
npm install @vue-vine/vite-plugin
```

## Usage

Configure in your `vite.config.ts`:

```ts
import { VineVitePlugin } from '@vue-vine/vite-plugin'

export default {
  plugins: [
    VineVitePlugin(),
  ],
}
```

Or use the convenient export from the main package:

```ts
import { VineVitePlugin } from 'vue-vine/vite'

export default {
  plugins: [
    VineVitePlugin(),
  ],
}
```

## License

MIT License © 2024-PRESENT [ShenQingchuan](https://github.com/shenqingchuan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@vue-vine/vite-plugin?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@vue-vine/vite-plugin
[npm-downloads-src]: https://img.shields.io/npm/dm/@vue-vine/vite-plugin?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@vue-vine/vite-plugin
