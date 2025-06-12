# 现在开始 {#get-started}

::: warning 🚨 注意

<b>在开始使用之前，您应该了解以下约定：</b>

- Vine 只支持 <span class="hlmark">Vue 3.0+</span> 和 <span class="hlmark">Vite</span>。
- Vine <span class="hlmark">仅支持 TypeScript</span>，JavaScript 用户无法使用完整功能。

:::

欢迎加入用另一种方式编写 Vue 的探索旅程！

首先请在你的项目中安装 Vue Vine ![npm](https://img.shields.io/npm/v/vue-vine)：

```bash
pnpm i -D vue-vine
```

Vine 提供了 Vite 插件和 VSCode 扩展来支持基础功能。

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
