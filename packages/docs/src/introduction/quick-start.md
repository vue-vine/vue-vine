# Get started

Welcome to join us to exploring another style of writing Vue!

Vine provides a Vite plugin and a VSCode extension to offer feature support.

![npm](https://img.shields.io/npm/v/vue-vine)

::: info TIPS
Vine's first stable release is `v0.1.0`.
:::

## Install Vite plugin

```bash
pnpm i -D vue-vine
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

## Install VSCode extension

Search "Vue Vine" in the marketplace and install it.

<img width="339" alt="image" src="https://github.com/vue-vine/vue-vine/assets/46062972/d86867d3-5a63-4541-b318-f5543f90cf0e">

## Use macro types

Vine provides a typescript declaration file to help you write macros with intellisense.

```json
{
  "compilerOptions": {
    "types": ["vue-vine/macros"]
  }
}
```
