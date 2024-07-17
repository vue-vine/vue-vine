# 现在开始 {#get-started}

::: warning 🚨 注意

<b>在开始使用之前，您应该了解以下约定：</b>

- Vine 只支持 Vue 3.0+ 和 Vite。
- Vine 仅支持 TypeScript，JavaScript 用户无法使用完整功能。

:::

欢迎加入用另一种方式编写 Vue 的探索旅程！

Vine 提供了 Vite 插件和 VSCode 扩展来支持基础功能。

除此之外，我们还提供了其他一些开发或配置时可能会需要用到的库，你可以在下一节 [周边生态](./ecosystem.md) 中了解更多细节。

![npm](https://img.shields.io/npm/v/vue-vine)

## 安装 Vite 插件 {#install-vite-plugin}

```bash
pnpm i -D vue-vine
```

在 `vite.config.ts` 中导入插件：

```ts
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    // ...其他插件
    VineVitePlugin()
  ],
})
```

## 安装 VSCode 扩展 {#install-vscode-extension}

在市场中搜索 "Vue Vine" 并安装。

<img width="320" alt="image" src="/vscode-ext-download.png">

## 使用 macro 类型 {#use-macro-types}

Vine 提供了一个 typescript 声明文件，以帮助你使用宏时获得智能提示。

```json
{
  "compilerOptions": {
    "types": ["vue-vine/macros"]
  }
}
```
