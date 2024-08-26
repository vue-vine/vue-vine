# Vue Vine

- [Contribution Guide](./CONTRIBUTING.md)
- [中文 README](./README-CN.md)

Another style of writing Vue components.

- NPM version: &nbsp; [![NPM Version](https://img.shields.io/npm/v/vue-vine)](https://www.npmjs.com/package/vue-vine)
- VSCode extension: &nbsp; [![VSCode ext version](https://vsmarketplacebadges.dev/version/shenqingchuan.vue-vine-extension.svg)](https://marketplace.visualstudio.com/items?itemName=shenqingchuan.vue-vine-extension)
- Check more details in docs: &nbsp; [![Netlify Status](https://api.netlify.com/api/v1/badges/ff99c4c5-2766-4716-81db-599ce4346647/deploy-status)](https://app.netlify.com/sites/vue-vine/deploys)

<details>
  <summary>
    <b>Why this ?</b>
  </summary>
  <br>

  There are many discussions in community that hopes for a solution that supports writing multiple Vue components in a single file. That's why `Vue Vine` was born.

  `Vue Vine` was designed to provide more flexibility of managing Vue components. It is a parallel style to SFC.

  Take a quick view:

  ![Quick view](./packages/docs/src/public/highlight-demo.png)

</details>

## Relavant packages

| Package | Version | Description |
| --- | --- | --- |
| [@vue-vine/compiler](./packages/compiler) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/compiler)](https://www.npmjs.com/package/@vue-vine/compiler) | Compiler |
| [@vue-vine/language-server](./packages/language-server) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/language-server)](https://www.npmjs.com/package/@vue-vine/language-server) | Language Server |
| [@vue-vine/language-service](./packages/language-service) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/language-service)](https://www.npmjs.com/package/@vue-vine/language-service) | Language Service |
| [@vue-vine/vite-plugin](./packages/vite-plugin) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/vite-plugin)](https://www.npmjs.com/package/@vue-vine/vite-plugin) | Vite Plugin |
| [@vue-vine/eslint-parser](./packages/eslint-parser) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/eslint-parser)](https://www.npmjs.com/package/@vue-vine/eslint-parser) | ESLint Parser |
| [vue-vine-tsc](./packages/tsc) | [![NPM Version](https://img.shields.io/npm/v/vue-vine-tsc)](https://www.npmjs.com/package/vue-vine-tsc) | TypeScript CLI checker |

## Install

```bash
# If you didn't install `@antfu/ni` yet, I highly recommend you to install it.
ni -D vue-vine
```

Use the plugin in `vite.config.ts`:

```ts
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    // ...Other plugins
    VineVitePlugin()
  ],
})
```

Then add macro's type definition in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vue-vine/macros"]
  }
}
```

For ESLint, install our custom ESLint parser:

```bash
ni -D @vue-vine/eslint-parser
```

You need to set custom ESLint parser for `.vine.ts` files:

```js
// eslint.config.mjs
import antfu from '@antfu/eslint-config'
import * as VueVineESLintParser from '@vue-vine/eslint-parser'

export default antfu(
  {
    // Override antfu's settings here:
    // - ESLint Stylistic is not supported yet
    stylistic: false,
  },
  {
    rules: {
      // ... Customize rules here
    },
  },
  {
    files: [
      'path/to/**/*.vine.ts',
    ],
    languageOptions: {
      parser: VueVineESLintParser,
    },
    rules: {
      // ... Customize rules here
    },
  },
)
```

Finally, install the VSCode extension, search `Vue Vine` in the marketplace.

<img width="339" alt="image" src="https://github.com/vue-vine/vue-vine/assets/46062972/d86867d3-5a63-4541-b318-f5543f90cf0e">

## Try the demo

You can try the demo by following steps:

For development environment setup, first you need to get the VSCode extension bundle ouput.

```bash
git clone https://github.com/vue-vine/vue-vine.git
cd vue-vine
pnpm install

# Build all the required packages
pnpm run build

# Build the VSCode extension
pnpm run build:ext
```

After building the VSCode extension, you can open the 'Debug' tab in VSCode, and start the **'Run Vine Extension'** debug session.

<img width="385" alt="image" src="https://github.com/vue-vine/vue-vine/assets/46062972/374b77a4-9d49-4eb6-a84b-f7ab64b99bdf">

Then start the Playground's dev server in another terminal session.

```bash
pnpm run play
```

1. You can see the demo in `http://localhost:3333/`.
2. You can inspect the transforming process in `http://localhost:3333/__inspect/`
