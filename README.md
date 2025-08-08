<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/vue-vine/assets/vue-vine-info-banner.png">
</div>
<br>
<br>

- [Contribution Guide](./CONTRIBUTING.md)
- [中文 README](./README-CN.md)

Another style of writing Vue components.

[![CI](https://github.com/vue-vine/vue-vine/actions/workflows/ci.yml/badge.svg)](https://github.com/vue-vine/vue-vine/actions/workflows/ci.yml)

- NPM version: &nbsp; [![NPM Version](https://img.shields.io/npm/v/vue-vine)](https://www.npmjs.com/package/vue-vine)
- VSCode extension: &nbsp; [![VSCode ext version](https://img.shields.io/visual-studio-marketplace/v/shenqingchuan.vue-vine-extension)](https://marketplace.visualstudio.com/items?itemName=shenqingchuan.vue-vine-extension)
- Open VSX extension: &nbsp; [![Open VSX ext version](https://img.shields.io/open-vsx/v/shenqingchuan/vue-vine-extension)](https://open-vsx.org/extension/shenqingchuan/vue-vine-extension)
- Check more details in [Vue Vine docs](https://vue-vine.dev): &nbsp; [![Netlify Status](https://api.netlify.com/api/v1/badges/ff99c4c5-2766-4716-81db-599ce4346647/deploy-status)](https://app.netlify.com/sites/vue-vine/deploys)

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

## Try the demo

Use interactive commands(`create-vue-vine`) to create your first project. Look here: [Project starter template](https://vue-vine.dev/introduction/quick-start.html#create-project-with-cli)

Or you can try it online: [Vue Vine Playground](https://stackblitz.com/~/github.com/vue-vine/stackblitz-playground)

## Relevant packages

| Category | Package | Version | Description |
| --- | --- | --- | --- |
| ![core](https://img.shields.io/badge/vue_vine-core-blue) | [@vue-vine/compiler](./packages/compiler) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/compiler)](https://www.npmjs.com/package/@vue-vine/compiler) | Compiler |
| ![core](https://img.shields.io/badge/vue_vine-core-blue) | [@vue-vine/language-server](./packages/language-server) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/language-server)](https://www.npmjs.com/package/@vue-vine/language-server) | Language Server |
| ![core](https://img.shields.io/badge/vue_vine-core-blue) | [@vue-vine/language-service](./packages/language-service) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/language-service)](https://www.npmjs.com/package/@vue-vine/language-service) | Language Service |
| ![core](https://img.shields.io/badge/vue_vine-core-blue) | [@vue-vine/vite-plugin](./packages/vite-plugin) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/vite-plugin)](https://www.npmjs.com/package/@vue-vine/vite-plugin) | Vite Plugin |
| ![eslint](https://img.shields.io/badge/vue_vine-eslint-gold) | [@vue-vine/eslint-parser](./packages/eslint-parser) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/eslint-parser)](https://www.npmjs.com/package/@vue-vine/eslint-parser) | ESLint Parser |
| ![eslint](https://img.shields.io/badge/vue_vine-eslint-gold) | [@vue-vine/eslint-plugin](./packages/eslint-plugin) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/eslint-plugin)](https://www.npmjs.com/package/@vue-vine/eslint-plugin) | ESLint Plugin |
| ![eslint](https://img.shields.io/badge/vue_vine-eslint-gold) | [@vue-vine/eslint-config](./packages/eslint-config) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/eslint-config)](https://www.npmjs.com/package/@vue-vine/eslint-config) | ESLint Config |
| ![nuxt](https://img.shields.io/badge/vue_vine-nuxt-green) | [@vue-vine/nuxt](./packages/nuxt-module) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/nuxt)](https://www.npmjs.com/package/@vue-vine/nuxt) | Nuxt Module |
| ![tsc](https://img.shields.io/badge/vue_vine-tsc-violet) | [vue-vine-tsc](./packages/tsc) | [![NPM Version](https://img.shields.io/npm/v/vue-vine-tsc)](https://www.npmjs.com/package/vue-vine-tsc) | TypeScript CLI checker |
| ![CLI](https://img.shields.io/badge/vue_vine-cli-cyan) | [create-vue-vine](./packages/create-vue-vine) | [![NPM Version](https://img.shields.io/npm/v/create-vue-vine)](https://www.npmjs.com/package/create-vue-vine) | Project starter CLI |

## Install

```bash
# If you didn't install `@antfu/ni` yet, I highly recommend you to install it.
ni vue-vine
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

For ESLint, install our custom ESLint config:

```bash
ni -D @vue-vine/eslint-config
```

You need to load the config into your flat configs.

```js
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

Finally, install the VSCode extension, search `Vue Vine` in the marketplace.

<img width="339" alt="image" src="https://github.com/vue-vine/vue-vine/assets/46062972/d86867d3-5a63-4541-b318-f5543f90cf0e">
