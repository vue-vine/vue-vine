# Get started

Welcome to join us to exploring another style of writing Vue!

Vine provides a Vite plugin and a VSCode extension to offer feature support.

::: warning Heads up!

Vine is still in early development, please wait for the first stable release `v0.1.0`.

![npm](https://img.shields.io/npm/v/vue-vine)
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

## Use macro types

Vine provides a typescript declaration file to help you write macros with intellisense.

```json
{
  "compilerOptions": {
    "types": ["vue-vine/macro"]
  }
}
```
