# 现在开始 {#get-started}

欢迎加入用另一种方式编写 Vue 的探索旅程！

Vine 提供了一个 Vite 插件和一个 VSCode 扩展。

![npm](https://img.shields.io/npm/v/vue-vine)

::: info 温馨提示
Vine 的第一个稳定版本是 `v0.1.0`。
:::

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

<img width="320" alt="image" src="https://github.com/vue-vine/vue-vine/assets/46062972/e4058bbb-f1e4-48f5-909a-760f1edabec3">

## 使用 macro 类型 {#use-macro-types}

Vine 提供了一个 typescript 声明文件，以帮助你使用宏时获得智能提示。

```json
{
  "compilerOptions": {
    "types": ["vue-vine/macro"]
  }
}
```
