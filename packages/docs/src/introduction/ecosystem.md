# Ecosystem

Besides Vite plugin and VSCode extension, Vine also provides some other libraries that you might need.

## ESLint config

Since we defined a new syntax for `.vine.ts`, i.e. the tagged template string as Vue template, we need a custom ESLint parser make ESLint work. if you're curious about the internal implementation, you can check out the [source code](https://github.com/vue-vine/vue-vine/tree/main/packages/eslint-parser). In a shortnut, it will replace the ESTree node of tagged template string with a Vue template root node.

We indeed provide an ESLint config for Vue Vine now, and it's supposed to work with most popular rule presets like `@antfu/eslint-config`, `@sxzz/eslint-config`, etc.

**But style rules are not fully supported yet, we will continue to make it better.**

To configure the custom parser, run the following command to install the package:

```bash
pnpm i -D @vue-vine/eslint-config
```

Then, add the following configuration to your `eslint.config.js`:

```js [eslint.config.js]
import antfu from '@antfu/eslint-config'

// `VueVine()` returns an ESLint flat config
import VueVine from '@vue-vine/eslint-config'

export default antfu(
  {
    // First option is not Linter.FlatConfig,
    // it's a setting for antfu's config itself
  },
  ...VueVine(),
)
```

## TypeScript checker in command line

As we know that Vue provided `vue-tsc` to run TypeScript check for `.vue` files, in order to support Vine, we also provide a similar command `vue-vine-tsc` to check `.vine.ts` files.

**To be noticed:** `vue-vine-tsc` is compatible with `vue-tsc`, so you can also use it to check `.vue` files.

To install the package, run the following command:

```bash
pnpm i -D vue-vine-tsc
```

Then, you may replace the `vue-tsc -b && ...` command in `"build"` script of `package.json`:

```diff [package.json]
{
  "scripts": {
-    "build": "vue-tsc -b && vite build",
+    "build": "vue-vine-tsc -b && vite build",
  }
}
```

## Slidev plugin

Since v1.4.0, Vine also provides a plugin for Slidev, you can use it to register Vine components in your Slidev project.

To install the plugin, you should add a `setup/main.ts` file in your Slidev project for setup Vue application, find more details in [Slidev documentation](https://sli.dev/custom/config-vue).

```ts [setup/main.ts]
import { defineAppSetup } from '@slidev/types'
import { VueVineSlidevPlugin } from 'vue-vine/slidev'

export default defineAppSetup(({ app }) => {
  app.use(
    VueVineSlidevPlugin(
      // Make sure this glob path is relative to this `setup/main.ts` file
      import.meta.glob('./components/*.vine.ts', { eager: true })
    )
  )
})
```

## Common questions

### UnoCSS Attribute Mode

Because Vue Vine's template type checking enabled the strict mode of Vue language tools, so it is not allowed to use arbitrary attributes on the HTML tags in the template. This will affect the scenario of using UnoCSS Attribute Mode. To solve this problem, please add a `shims.d.ts` file to the project `tsconfig.json` (the `include` option) and write the following content:

```ts [shims.d.ts]
declare module 'vue' {
  interface HTMLAttributes {
    [key: string]: any
  }
}

export {}
```
