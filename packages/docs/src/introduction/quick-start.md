# Get started

::: warning 🚨 WARNING

<b>Before starting to use it, you're supposed to know the following conventions:</b>

- Vine was designed to only support <span class="hlmark">Vue 3.0+</span>.
- It provides official support for <span class="hlmark">Vite</span> and <span class="hlmark">Rspack</span>.
- Vine is designed to support <span class="hlmark">only TypeScript</span>, JavaScript-only users can't harness the complete range of functionalities.

:::

Welcome to join us to exploring another style of writing Vue!

Install Vue Vine ![npm](https://img.shields.io/npm/v/vue-vine) in your project:

```bash
pnpm i vue-vine
```

Vine provides build tool integrations (Vite plugin and Rspack loader) and a VSCode extension to offer feature support.

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

## Install Rsbuild plugin

::: tip 🧪 Beta Feature
Rsbuild support is currently in **beta**.

Please install the beta version and [report any issues](https://github.com/vue-vine/vue-vine/issues) you encounter.
:::

Use the plugin in `rsbuild.config.ts`:

```ts [rsbuild.config.ts]
import { defineConfig } from '@rsbuild/core'
import { pluginVueVine } from 'vue-vine/rsbuild'

export default defineConfig({
  plugins: [
    pluginVueVine({
      // Optional compiler options
      // compilerOptions: { ... }
    })
  ],
})
```

::: info Why use the plugin?
The Rsbuild plugin provides a simpler, higher-level integration compared to the Rspack loader. It automatically:
- Configures the necessary loaders for `.vine.ts` files
- Sets up style processing rules
- Injects Vue runtime flags via DefinePlugin

For advanced users who need fine-grained control over loader configuration, you can still use the Rspack loader directly (see next section).
:::

## Install Rspack loader (Advanced)

::: tip 🧪 Beta Feature
Rspack support is currently in **beta**.

Please install the beta version and [report any issues](https://github.com/vue-vine/vue-vine/issues) you encounter.
:::

Install the Rspack loader:

```bash
pnpm add -D @vue-vine/rspack-loader@beta
```

Configure the loader in `rspack.config.ts`:

```ts [rspack.config.ts]
import { defineConfig } from '@rspack/cli'
import { rspack } from '@rspack/core'

// Target browsers for transpilation
const targets = ['last 2 versions', '> 0.2%', 'not dead']

export default defineConfig({
  module: {
    rules: [
      // Process .vine.ts files with chained loaders
      // Loaders execute from right to left (bottom to top):
      // 1. @vue-vine/rspack-loader: Transforms Vine components to TypeScript
      // 2. builtin:swc-loader: Transforms TypeScript to JavaScript
      {
        test: /\.vine\.ts$/,
        resourceQuery: { not: [/vine-style/] }, // Exclude style virtual modules
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: { syntax: 'typescript' },
              },
              env: { targets },
            },
          },
          {
            loader: '@vue-vine/rspack-loader',
          },
        ],
      },
      // Process Vine style virtual modules
      {
        resourceQuery: /vine-style/,
        use: [
          {
            loader: '@vue-vine/rspack-loader/style-loader',
          },
        ],
        type: 'css',
      },
      // ...other rules
    ],
  },
  plugins: [
    // Required for Vue runtime
    new rspack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
  ],
})
```

::: info Why chained loaders?
The Vine compiler outputs TypeScript code that needs to be transformed to JavaScript. Rspack's built-in `builtin:swc-loader` is used for this TypeScript-to-JavaScript transformation, providing excellent performance through native Rust implementation.

The `resourceQuery: { not: [/vine-style/] }` ensures that CSS content from Vine style blocks isn't processed by the TypeScript/JavaScript loaders.
:::

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
