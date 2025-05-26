# 附加功能 {#enhanced-features}

Vine 提供了一些附加功能，它们是一些好用的语法糖。

## 转换布尔值属性 <VersionTip version="v1.3.0+" /> {#transform-boolean-props}

借鉴自 [Vue Macros](https://vue-macros.dev/features/boolean-prop.html) —— 基于 MIT 许可证

将 `<Comp checked />` 转换为 `<Comp :checked="true" />`。

将 `<Comp !checked />` 转换为 `<Comp :checked="false" />`。

**默认：** 未启用

**使用方法：**

```ts
// vite.config.ts
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    VineVitePlugin({
      vueCompilerOptions: {
        transformBooleanProp: true,
      },
    }),
  ],
})
```
