# Vue Vine

[English](./README.md)

另一种编写 Vue.js 的方式。

在 [vue-vine.dev](https://vue-vine.dev/) 了解更多。

## 安装

```bash
# 如果你还没有安装 `@antfu/ni`，强烈推荐你安装它。
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
