# 现在开始 {#get-started}

欢迎加入用另一种方式编写 Vue 的探索旅程！

Vine 提供了一个 Vite 插件和一个 VSCode 扩展。

::: warning 注意！

Vine 目前还处于早期开发阶段，请等待第一个稳定版本 `v0.1.0`。

![npm](https://img.shields.io/npm/v/vue-vine)
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