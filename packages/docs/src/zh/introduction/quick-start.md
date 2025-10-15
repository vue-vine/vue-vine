# 现在开始 {#get-started}

::: warning 🚨 注意

<b>在开始使用之前，您应该了解以下约定：</b>

- Vine 只支持 <span class="hlmark">Vue 3.0+</span>。
- 我们提供了对 <span class="hlmark">Vite</span> 和 <span class="hlmark">Rspack</span> 的支持。
- Vine <span class="hlmark">仅支持 TypeScript</span>，JavaScript 用户无法使用完整功能。

:::

欢迎加入用另一种方式编写 Vue 的探索旅程！

首先请在你的项目中安装 Vue Vine ![npm](https://img.shields.io/npm/v/vue-vine)：

```bash
pnpm i vue-vine
```

Vine 提供了构建工具集成（Vite 插件和 Rspack loader）以及 VSCode 扩展来支持基础功能。

除此之外，我们还提供了其他一些开发或配置时可能会需要用到的库，你可以在下一节 [周边生态](./ecosystem.md) 中了解更多细节。

## 安装 Vite 插件 {#install-vite-plugin}

在 `vite.config.ts` 中导入插件：

```ts [vite.config.ts]
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    // ...其他插件
    VineVitePlugin()
  ],
})
```

## 安装 Rspack loader {#install-rspack-loader}

::: tip 🧪 Beta 功能
Rspack 支持目前处于 **beta** 阶段。

请安装 beta 版本并[报告您遇到的任何问题](https://github.com/vue-vine/vue-vine/issues)。
:::

安装 Rspack loader：

```bash
pnpm add -D @vue-vine/rspack-loader@beta
```

在 `rspack.config.ts` 中配置 loader：

```ts [rspack.config.ts]
import { defineConfig } from '@rspack/cli'
import { rspack } from '@rspack/core'

// 目标浏览器配置，用于代码转译
const targets = ['last 2 versions', '> 0.2%', 'not dead']

export default defineConfig({
  module: {
    rules: [
      // 使用链式 loader 处理 .vine.ts 文件
      // Loader 从右到左（从下到上）执行：
      // 1. @vue-vine/rspack-loader：将 Vine 组件转换为 TypeScript
      // 2. builtin:swc-loader：将 TypeScript 转换为 JavaScript
      {
        test: /\.vine\.ts$/,
        resourceQuery: { not: [/vine-style/] }, // 排除样式虚拟模块
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
      // 处理 Vine 样式虚拟模块
      {
        resourceQuery: /vine-style/,
        use: [
          {
            loader: '@vue-vine/rspack-loader/style-loader',
          },
        ],
        type: 'css',
      },
      // ...其他 rules
    ],
  },
  plugins: [
    // Vue 运行时所需
    new rspack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
  ],
})
```

::: info 为什么需要链式 loader？
Vine 编译器输出的是 TypeScript 代码，需要转换为 JavaScript。Rspack 内置的 `builtin:swc-loader` 用于进行 TypeScript 到 JavaScript 的转换，通过 Rust 原生实现提供了卓越的性能。

`resourceQuery: { not: [/vine-style/] }` 确保 Vine 样式块中的 CSS 内容不会被 TypeScript/JavaScript loader 处理。
:::

## 通过项目脚手架创建项目 {#create-project-with-cli}

你可以渐进式地将 Vue Vine 集成到现有的 Vue 3 项目中，但如果你想要启动一个新项目，放弃 SFC，只想使用 Vue Vine，我们也为你提供了一个创建项目模板的脚手架工具。

运行以下命令来创建一个新项目：

```bash
# 你没有全局安装 CLI 的话
pnpx create-vue-vine my-vine-project

# 你已经全局安装 CLI 的话
create-vue-vine my-vine-project
```

<details>
<summary class="text-sm text-gray-500 cursor-pointer"><b>或者：</b>也可以选择全局安装 CLI</summary>

```bash
pnpm i -g create-vue-vine
```

</details>

<details>
<summary class="text-sm text-gray-500 cursor-pointer">点击这里预览运行 CLI 后的后续操作</summary>

```text
> pnpx create-vue-vine my-vine-project

...

┌  Vue Vine - Another style of writing Vue components
│
◇  Use Vue Router?
│  Yes
│
◇  Use Pinia as state management?
│  Yes
│
◇  Using atomized css?
│  - UnoCSS
│  - Tailwind
│  - No
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

## 安装 VSCode 扩展 {#install-vscode-extension}

在市场中搜索 "Vue Vine" 并安装。

<img width="320" alt="image" src="/vscode-ext-download.png">

## 使用 macro 类型 {#use-macro-types}

Vine 提供了一个 typescript 声明文件，以帮助你使用宏时获得智能提示。

```json [tsconfig.json]
{
  "compilerOptions": {
    "types": ["vue-vine/macros"]
  }
}
```
