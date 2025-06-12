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

```ts [vite.config.ts]
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    // ...Other plugins
    VineVitePlugin()
  ],
})
```

## Create project with CLI

You can gradually integrate Vue Vine into an existing Vue 3 project, but if you want to start a new project, give up SFC, and only use Vue Vine, we also provide a project template for you.

Run the following command to create a new project:

```bash
pnpx create-vue-vine my-vine-project
```

<details>
<summary class="text-sm text-gray-500 cursor-pointer"><b>Another way:</b> You can also choose to install the CLI globally</summary>

```bash
pnpm i -g create-vue-vine
```

</details>

<details>
<summary class="text-sm text-gray-500 cursor-pointer">Click here to preview the subsequent operations after running the CLI</summary>

```text

...

┌  Vue Vine - Another style of writing Vue components
│
◇  Use Vue Router?
│  Yes
│
◇  Install all dependencies for the project now?
│  Yes
│
◇  Project created at: /path/to/my-vine-project
│

...

◇  Dependencies installed!
│
└  You're all set! Now run:

   cd my-vine-project
   pnpm dev

   Happy hacking!
```

</details>

## Install VSCode extension

Search "Vue Vine" in the marketplace and install it.

<img width="339" alt="image" src="/vscode-ext-download.png">

## Use macro types

Vine provides a typescript declaration file to help you write macros with intellisense.

```json [tsconfig.json]
{
  "compilerOptions": {
    "types": ["vue-vine/macros"]
  }
}
```
