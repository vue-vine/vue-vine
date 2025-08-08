<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/vue-vine/assets/vue-vine-info-banner-cn.png">
</div>
<br>
<br>

- [English README](./README.md)
- [贡献指南](./CONTRIBUTING-zhCN.md)

创造另一种书写 Vue 组件的方式。

[![CI](https://github.com/vue-vine/vue-vine/actions/workflows/ci.yml/badge.svg)](https://github.com/vue-vine/vue-vine/actions/workflows/ci.yml)

- NPM 版本：&nbsp; [![NPM Version](https://img.shields.io/npm/v/vue-vine)](https://www.npmjs.com/package/vue-vine)
- VSCode 插件版本：&nbsp; [![VSCode ext version](https://img.shields.io/visual-studio-marketplace/v/shenqingchuan.vue-vine-extension)](https://marketplace.visualstudio.com/items?itemName=shenqingchuan.vue-vine-extension)
- Open VSX 插件版本: &nbsp; [![Open VSX ext version](https://img.shields.io/open-vsx/v/shenqingchuan/vue-vine-extension)](https://open-vsx.org/extension/shenqingchuan/vue-vine-extension)
- 要了解更多细节，请查看 [官方文档](https://vue-vine.dev)：&nbsp;[![Netlify Status](https://api.netlify.com/api/v1/badges/ff99c4c5-2766-4716-81db-599ce4346647/deploy-status)](https://app.netlify.com/sites/vue-vine/deploys)

<details>
  <summary>
    <b>为什么做这样一个项目？</b>
  </summary>
  <br>

  在社区中，有很多帖子讨论过希望有一个支持在单个文件中编写多个 Vue 组件的解决方案。`Vue Vine` 因此而生。

  `Vue Vine` 旨在提供更多管理 Vue 组件的灵活性，它并不是要取代 Vue SFC，而是作为一种并行的解决方案。

  下面是一个简单的示例预览：

  ![示例预览](./packages/docs/src/public/highlight-demo.png)

</details>

## 尝试示例

使用交互式命令(`create-vue-vine`)创建您的第一个项目。看这里: [项目启动模板](https://vue-vine.dev/zh/introduction/quick-start.html#create-project-with-cli)

或者你可以在线上尝试: [Vue Vine Playground](https://stackblitz.com/~/github.com/vue-vine/stackblitz-playground)

## 项目 NPM 包总览

| 类别 | 包名 | 版本 | 简介 |
| --- | --- | --- | --- |
| ![core](https://img.shields.io/badge/vue_vine-core-blue) | [@vue-vine/compiler](./packages/compiler) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/compiler)](https://www.npmjs.com/package/@vue-vine/compiler) | 编译器 |
| ![core](https://img.shields.io/badge/vue_vine-core-blue) | [@vue-vine/language-server](./packages/language-server) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/language-server)](https://www.npmjs.com/package/@vue-vine/language-server) | 语言服务器 |
| ![core](https://img.shields.io/badge/vue_vine-core-blue) | [@vue-vine/language-service](./packages/language-service) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/language-service)](https://www.npmjs.com/package/@vue-vine/language-service) | 语言服务集成 |
| ![core](https://img.shields.io/badge/vue_vine-core-blue) | [@vue-vine/vite-plugin](./packages/vite-plugin) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/vite-plugin)](https://www.npmjs.com/package/@vue-vine/vite-plugin) | Vite 插件 |
| ![eslint](https://img.shields.io/badge/vue_vine-eslint-gold) | [@vue-vine/eslint-parser](./packages/eslint-parser) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/eslint-parser)](https://www.npmjs.com/package/@vue-vine/eslint-parser) | ESLint 自定义解析器 |
| ![eslint](https://img.shields.io/badge/vue_vine-eslint-gold) | [@vue-vine/eslint-plugin](./packages/eslint-plugin) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/eslint-plugin)](https://www.npmjs.com/package/@vue-vine/eslint-plugin) | ESLint 插件 |
| ![eslint](https://img.shields.io/badge/vue_vine-eslint-gold) | [@vue-vine/eslint-config](./packages/eslint-config) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/eslint-config)](https://www.npmjs.com/package/@vue-vine/eslint-config) | ESLint 配置 |
| ![nuxt](https://img.shields.io/badge/vue_vine-nuxt-green) | [@vue-vine/nuxt](./packages/nuxt-module) | [![NPM Version](https://img.shields.io/npm/v/@vue-vine/nuxt)](https://www.npmjs.com/package/@vue-vine/nuxt) | Nuxt Module |
| ![tsc](https://img.shields.io/badge/vue_vine-tsc-violet) | [vue-vine-tsc](./packages/tsc) | [![NPM Version](https://img.shields.io/npm/v/vue-vine-tsc)](https://www.npmjs.com/package/vue-vine-tsc) | TypeScript CLI 检查器 |
| ![CLI](https://img.shields.io/badge/vue_vine-cli-cyan) | [create-vue-vine](./packages/create-vue-vine) | [![NPM Version](https://img.shields.io/npm/v/create-vue-vine)](https://www.npmjs.com/package/create-vue-vine) | 项目脚手架 CLI |

## 安装

```bash
# 如果你还没有安装 `@antfu/ni`，我强烈建议你安装它。
ni vue-vine
```

在 `vite.config.ts` 中使用插件：

```ts
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    // ...其他插件
    VineVitePlugin()
  ],
})
```

然后在 `tsconfig.json` 中添加宏的类型定义：

```json
{
  "compilerOptions": {
    "types": ["vue-vine/macros"]
  }
}
```

对于 ESLint, 请安装我们提供的 ESLint 配置包：

```bash
ni -D @vue-vine/eslint-config
```

你需要将其载入到 ESLint flat configs 中。

```js
import antfu from '@antfu/eslint-config'

// `VueVine()` 返回了一个 ESLint flat config
import VueVine from '@vue-vine/eslint-config'

export default antfu(
  {
    // 第一个选项对象不是 ESLint 的 FlatConfig
    // 是 antfu 规则自身的配置
  },
  ...VueVine(),
)
```

最后，安装 VSCode 插件，在市场中搜索 `Vue Vine`。

<img width="339" alt="image" src="https://github.com/vue-vine/vue-vine/assets/46062972/d86867d3-5a63-4541-b318-f5543f90cf0e">
