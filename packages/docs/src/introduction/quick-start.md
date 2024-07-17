# Get started

::: warning 🚨 WARNING

<b>Before starting to use it, you're supposed to know the following conventions:</b>

- Vine was designed to only support <span class="hlmark">Vue 3.0+</span> and <span class="hlmark">Vite</span>.
- Vine is designed to support <span class="hlmark">only TypeScript</span>, JavaScript-only users can't harness the complete range of functionalities.

:::

Welcome to join us to exploring another style of writing Vue!

Install Vue Vine ![npm](https://img.shields.io/npm/v/vue-vine) in your project:

```bash
pnpm i -D vue-vine
```

Vine provides a Vite plugin and a VSCode extension to offer feature support.

Besides, we also provide some other libraries that you might need during development or configuration, you can learn more details in the next section [Ecosystem](./ecosystem.md).

## Install Vite plugin

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

<img width="339" alt="image" src="/vscode-ext-download.png">

## Use macro types

Vine provides a typescript declaration file to help you write macros with intellisense.

```json
{
  "compilerOptions": {
    "types": ["vue-vine/macros"]
  }
}
```
