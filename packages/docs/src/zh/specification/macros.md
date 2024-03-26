# 宏 {#macros}

宏是一些特殊的函数，它们只在编译时具有意义，它们是 Vine 编译器转换相应组件属性的提示。

这些宏的类型定义可以在[我们的 Github 仓库](https://github.com/vue-vine/vue-vine/blob/main/packages/vue-vine/types/macros.d.ts)中找到。

## `vineEmits` {#vineemits}

为组件定义 `emits`，用法与官方版本基本一致。

该宏没有参数，并返回 emits 函数，您**必须**定义一个变量来接收返回值。

这个类型参数的语法与 Vue 3.3 更简洁的语法相同，请查阅[官方文档](https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits)了解更多细节。

```vue-vine
const myEmits = vineEmits<{
  update: [foo: string, bar: number]
}>()

myEmits('update', 'foo', 1)
```

## `vineExpose` {#vineexpose}

这个宏的使用方法与官方 `defineExpose` 宏完全一致。

请在 Vue.js 官方文档的[相应部分](https://cn.vuejs.org/api/sfc-script-setup.html#defineexpose)中查看描述。

## `vineSlots` {#vineslots}

这个宏的使用方法与官方 `defineSlots` 宏完全一致。

请在 Vue.js 官方文档的[相应部分](https://cn.vuejs.org/api/sfc-script-setup.html#defineslots)中查看描述。

## `vineOptions`

此宏仅支持您定义 2 个重要的 Vue 组件选项：`name` 和 `inheritAttrs`。

```vue-vine
vineOptions({
  name: 'MyComponent',
  inheritAttrs: false
})
```

## `vineStyle` {#vinestyle}

这是一个用于定义样式的宏，替代了 SFC 的 `<style>` 块。如果您的组件需要 `scoped`，可以使用 `vineStyle.scoped`。

在 VCF 外部不允许调用 `vineStyle`，在一个 VCF 中不允许调用多次。

您还可以指定任何您想要的 CSS 处理器语言，查看下面的示例：

```vue-vine
vineStyle(scss`
  .foo {
    color: red;
    .bar {
      background: yellow;
    }
  }
`)
```
