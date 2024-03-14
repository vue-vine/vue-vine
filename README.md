# Vue Vine

[中文 README](./README-CN.md)

Another style of writing Vue components.

## Why this ?

There are many discussions in community that hopes for a solution that supports writing multiple Vue components in a single file. That's why `Vue Vine` was born.

Check more details in our [documentation](https://vue-vine.netlify.app/). [![Netlify Status](https://api.netlify.com/api/v1/badges/ff99c4c5-2766-4716-81db-599ce4346647/deploy-status)](https://app.netlify.com/sites/vue-vine/deploys)

`Vue Vine` was designed to provide more flexibility of managing Vue components. It is a parallel style to SFC.

Take a quick view:

![Quick view](./packages/docs/src/public/highlight-demo.png)

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

## Try the demo

**warning:** For now, `Vue Vine` is still under heavy development, please don't use it in production.

You can try the demo by following steps:

For development environment setup, first you need to get the VSCode extension bundle ouput.

```bash
git clone https://github.com/vue-vine/vue-vine.git
cd vue-vine
pnpm install

# Build all the required packages
pnpm run build

# Start watching the VSCode extension's building
pnpm run dev:ext
```

After building the VSCode extension, you can open the 'Debug' tab in VSCode, and start the **'Run Vine Extension'** debug session.

<img width="385" alt="image" src="https://github.com/vue-vine/vue-vine/assets/46062972/374b77a4-9d49-4eb6-a84b-f7ab64b99bdf">

Then start the Playground's dev server in another terminal session.

```bash
pnpm run play
```

1. You can see the demo in `http://localhost:3333/`.
2. You can inspect the transforming process in `http://localhost:3333/__inspect/`
