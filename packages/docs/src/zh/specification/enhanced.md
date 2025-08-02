# 附加功能 {#enhanced-features}

Vine 提供了一些附加功能，它们是一些好用的语法糖。

## 转换布尔值属性 {#transform-boolean-props}

Vue 的 Boolean Casting 机制在官方版本实现中会存在一些 BUG，详情请看 [这个例子](https://play.vuejs.org/#eNp9UsFOwzAM/RUrFzYJtUJwmsokQBzgAIhx7CXt3BFokyhJx6bSf8fOWBlj7Fa/9/z6YrsTV9YmyxbFRGS+dMoG8BhaO821aqxxAW5MY6FypoGTJOWC5Se5ztKNnpRUBGxsLQNSBZC9nk1niIArSSh6KLA2H1lKcKSjpZQSiqKAsiwhJTxLdzzEqQi+NLpSi+TNG03xOm7NRUm9qkb3aIMy2udiApFhTtb0m/uIBdfi6RYvX7F8P4C/+RVjuXhy6NEtMRcDF6RbYNjQt7MHXNH3QDZm3takPkI+ozd1yxk3sutWzyn2ji6mvYtDVnrx4m9XAbXfPoqDsrKP+lzQ0Hls/z39J+55chH7ct3TFLcL298v1FIvLqmPbGjec6yUxidnrM864H5azwQKY2qUtF/gVQ01fIIPjkIzQfubfJeEDx39dDQ+fiRztZzyEVxC18H97PEh2bioaj0ifAx9DyOiwtqiqeK99P04S7lvMOALOmRA+L4BS/8a8PkdMiB834ClOwa/D7b/ArqgGmM=)。

Vine 提供了一种特殊的转换机制来处理布尔值属性，这借鉴自 [Vue Macros](https://vue-macros.dev/features/boolean-prop.html) —— 基于 MIT 许可证。

将 `<Comp checked />` 转换为 `<Comp :checked="true" />`。

将 `<Comp !checked />` 转换为 `<Comp :checked="false" />`。

但是该功能和 UnoCSS 的 attribute mode 存在冲突，因为当应用了上述规则时，`<div h-12px />` 在相应 DOM 节点上会是 `<div h-12px="true" />`，而这会导致 UnoCSS 生成的 CSS 代码无法在该节点上生效。

如果你确定要保留 UnoCSS 的 attribute mode 功能，请在 Vite 插件中作如下配置、显式禁用此功能：

```ts
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    VineVitePlugin({
      vueCompilerOptions: {
        __enableTransformBareAttrAsBool: false,
      },
    }),
  ],
})
```
