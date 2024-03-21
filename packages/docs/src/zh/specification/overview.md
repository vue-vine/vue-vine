---
outline: deep
---

# 规范 {#specification}

本章将介绍 Vue Vine 的所有基本概念。

::: warning 🚨 注意

<b>在开始使用之前，您应该了解以下约定：</b>

- Vine 只支持 Vue 3.0+ 和 Vite。
- Vine 仅支持 TypeScript，JavaScript 用户可能无法体验完整功能。

:::

## 文件扩展名 {#file-extension-and-semantics}

Vine 使用 `.vine.ts` 作为文件扩展名，因此您知道您实际上是在编写 TypeScript，TypeScript 中的任何有效语法在 Vine 中也是合法的。

但是我们的确限制了一些在 TypeScript 中的使用场景，这都是为了形成一个容易解析的上下文给 Vine 编译器，您必须了解并遵循这些限制。您可以查看 [注意事项](./caveats) 章节了解更多详细信息。

## Vine 组件函数 {#vine-component-function}

Vine 组件函数（在接下来的文档中，我们将称之为 **"VCF"**）是一个返回由 `vine` 标记的模板字符串的函数，用于声明组件的模板。

这也就是说，任何函数在其返回值上显式使用 `vine` 标记的模板字符串，编译器都会将其识别为 Vue Vine 组件。

```vue-vine
function MyComponent() {
  return vine`<div>Hello World</div>`
}

// 这也是有效的
const AnotherComponent = () => vine`<div>Hello World</div>`
```

Vine 编译器将在底层将这种函数转换为 Vue 组件对象。

而这个标记模板字符串表达式最终的值只是 `undefined`，没有任何运行时的意义。

在 TypeScript 源码上下文中，这虽然确实是一个语法上合法的函数，<b class="text-rose-400">但在别处调用它没有任何作用，为避免未定义行为，也请不要这样做。</b>

### template {#template}

**在 `vine`模板字符串中是禁止使用表达式插值的。**

因为整个标记模板字符串是一个原始的 Vue 模板。Vine 编译器将其传递给 `@vue/compiler-dom` 进行编译，最终编译为渲染函数。

```vue-vine
function MyComponent() {
  const name = 'World'

  return vine`<div>Hello ${name}</div>` // 这将报错
}
```

### setup {#setup}

::: info 提示

我们假定您已经对 Vue 3 的 `<script setup>` 有所了解，如果您不了解，请参阅 [Vue 文档相应章节](https://cn.vuejs.org/api/sfc-script-setup.html#script-setup)。

:::

您可以将 VCF 除返回语句外的函数体部分视为 Vue SFC 中的 `<script setup>`，在其中定义组件的逻辑。

以下是一个示例，高亮的部分会被编译为 Vue 组件的 `setup` 函数中，处理的方式就像 Vue SFC 中的 `<script setup>` 一样。

```vue-vine
function MyComponent() {
  const num = ref(0)
  const randomPick = () => {
    num.value = Math.floor(Math.random() * 10)
  }

  return vine`
    <div :data-test-id="testId">
      <button @click="randomPick">Pick</button>
      <div>{{ num }}</div>
    </div>
  `
}
```

### props {#props}

若要为组件定义 props，有两种方式：

1. 给组件函数设置形式参数 `props` ，并且是第一个参数，并为其编写一个 TypeScript 对象字面量形式的类型注解，其中包含您想要定义的所有 props。

2. 使用 `vineProp` 宏逐个定义 prop，但这种方式的优势在于您可以很方便地将每个 prop 的值作为一个 `Ref` 使用，不用再手动将 `props` 进行 `toRefs` 处理。

我们为 props 提供了一个专门的章节供你 [参阅](./props.html) 以获取更多细节。

## 宏 {#macros}

随着 Vue 3.2 的发布，我们可以在 `<script setup>` 块中使用宏，而 [Vue Macros](https://vue-macros.sxzz.moe/) 将这个想法推向了极致，在 Vue 3.3 中，Vue 添加了更多内置宏。

在 Vine 中，我们目前只提供了一小部分宏，您可以在我们单独的 [宏](./macros.html) 章节中查看更多详细信息。我们保留了将来添加更多宏的可能性，但我们将谨慎地迈出每一步。
