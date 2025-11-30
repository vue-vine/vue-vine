# @vue-vine/rspeedy-plugin-vue-vine

Rspeedy plugin for Vue Vine on Lynx platform.

## Installation

```bash
pnpm add @vue-vine/rspeedy-plugin-vue-vine
```

## Usage

```ts
// lynx.config.ts
import { defineConfig } from '@lynx-js/rspeedy'
import { pluginVueVineLynx } from '@vue-vine/rspeedy-plugin-vue-vine'

export default defineConfig({
  plugins: [pluginVueVineLynx()],
  source: {
    entry: {
      main: './src/index.ts',
    },
  },
})
```

## Features

- Transforms `.vine.ts` files for Lynx platform
- Integrates with `@vue-vine/runtime-lynx` for native rendering
- Supports Lynx's dual-thread architecture

## License

MIT

