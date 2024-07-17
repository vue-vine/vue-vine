# Ecosystem

Besides Vite plugin and VSCode extension, Vine also provides some other libraries that you might need.

## Custom ESLint parser

Since we defined a new syntax for `.vine.ts`, i.e. the tagged template string as Vue template, we need a custom ESLint parser make ESLint work. if you're curious about the internal implementation, you can check out the [source code](https://github.com/vue-vine/vue-vine/tree/main/packages/eslint-parser). In a shortnut, it will replace the ESTree node of tagged template string with a Vue template root node.

We haven't provided any specific ESLint rules for Vue Vine yet, but it's supposed to work with most of the existing rule presets like `@antfu/eslint-config`, `@sxzz/eslint-config`, etc.

**But style rules are not fully supported yet:**

- `ESLint-Stylistics` will break template format due to some issues
- `eslint-plugin-prettier` seems fine but doesn't fix much for template formatting.

To configure the custom parser, run the following command to install the package:

```bash
pnpm i -D @vue-vine/eslint-parser
```

Then, add the following configuration to your `eslint.config.mjs`:

```js
import antfu from '@antfu/eslint-config'
import * as VueVineESLintParser from '@vue-vine/eslint-parser'

export default antfu(
  {
    // Override settings
    // for antfu's ESLint config
  },
  {
    // Some user config
    // that might been used
    // for non-Vine files
  },
  {
    files: [
      'path/to/**/*.vine.ts',
    ],
    languageOptions: {
      parser: VueVineESLintParser,
    },
    rules: {
      // Customize rules here
      // for `.vine.ts` files
    },
  },
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

```diff
{
  "scripts": {
-    "build": "vue-tsc -b && vite build",
+    "build": "vue-vine-tsc -b && vite build",
  }
}
```

## Project starter template

You're able to progressively integrate Vue Vine in existing Vue 3 projects, but if you want to start a new project, abandon SFC and just using Vue Vine, we provide a project starter template for you.

**(Optional)** Install the CLI globally:

```bash
pnpm i -g create-vue-vine
```

Then, run the following command to create a new project:

```bash
# If you didn't install the CLI globally
pnpx create-vue-vine my-vine-project

# If you installed the CLI globally
create-vue-vine my-vine-project
```

You may seen the following output:

```text
> pnpx create-vue-vine my-vine-project

...

┌  Vue Vine - Another style of writing Vue components
│
◇  Use Vue Router?
│  Yes
│
◇  Project created at: /path/to/my-vine-project
│
◇  Install dependencies?
│  Yes
│

...

◇  Dependencies installed!
│
└  You're all set! Now run:

  cd my-vine-project
  pnpm dev

  Happy hacking!
```
