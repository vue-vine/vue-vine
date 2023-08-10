# 宏 {#macros}

宏是一些特殊的函数，它们只在编译时具有意义，它们是 Vine 编译器转换相应组件属性的提示。

这些宏的类型定义可以在[我们的 Github 仓库](https://github.com/vue-vine/vue-vine/blob/main/packages/vue-vine/types/macros.d.ts)中找到。

## `vineProp` {#vineprop}

定义组件的 prop。它受到 [Vue Macros](https://vue-macros.sxzz.moe/macros/define-prop.html) 的启发，但有一些不同之处：

- 您必须给出一个类型参数来指定 prop 的类型，或者您必须提供一个默认值。
- `vineProp` 的第一个参数是 prop 的验证器，它是可选的。

```vue-vine
const foo = vineProp<string>()
const title = vineProp<string>(value => value.startsWith('#'))
```

- 对于带有默认值的 prop，您可以使用 `vineProp.withDefault`，验证器是第二个参数。

  由于 TypeScript 能够推断出默认值的类型，您不需要将类型参数传递给它。

  除了任何 `boolean` 类型的默认值之外，如果您确实需要一个布尔型 prop，您不应该传递一个变量，而只传递 `true` 或 `false` 字面量。尽管 TypeScript 可以从变量中推断，但 Vine 编译器不嵌入 TypeScript 编译器，因此无法获取该信息。

```vue-vine
// 正确的示例
const foo = vineProp.withDefault('bar')
const bool = vineProp.withDefault(false)
```

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

此宏只是官方 `defineExpose` 宏的别名，使用方法相同。

请在 Vue.js 官方文档的[相应部分](https://vuejs.org/api/sfc-script-setup.html#defineexpose)中查看描述。

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
