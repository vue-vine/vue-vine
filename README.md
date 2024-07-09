# Vue Vine

[中文 README](./README-CN.md)

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
