---
outline: deep
---

# 规范 {#specification}

本章将介绍 Vue Vine 的所有基本概念。

在开始使用之前，您应该了解以下约定：

- Vine 只支持 Vue 3 和 Vite。
- Vine 仅支持 TypeScript，JavaScript 用户可能无法完全体验。
- Vine 目标为 ESM（ES 模块），不支持 `require`。

## 文件扩展名 {#file-extension}

Vine 使用 `.vine.ts` 作为文件扩展名，因此您知道您实际上是在编写 TypeScript，TypeScript 中的任何有效语法在 Vine 中也是有效的。

## Vine 组件函数 {#vine-component-function}

Vine 组件函数是一个返回由 `vine` 标记的模板字符串的函数，用于声明组件的模板。

```vue-vine
function MyComponent() {
  return vine`<div>Hello World</div>`
}
```

在接下来的文档中，我们将称之为 **"VCF"**。

Vine 编译器将在内部将这种函数转换为 Vue 组件对象。

此外，标记模板字符串表达式不会返回任何内容。

在 TypeScript 上下文中，这确实是一个有效的函数，**但调用它没有任何意义，所以不要这样做。**

### template {#template}

禁止在模板中使用表达式插值，因为整个标记模板字符串是一个原始的 Vue 模板。Vine 编译器将其传递给 `@vue/compiler-dom` 进行编译，最终编译为渲染函数。

```vue-vine
function MyComponent() {
  const name = 'World'

  return vine`<div>Hello ${name}</div>` // 这将报错
}
```

### setup {#setup}

您可以将 VCF 视为 Vue 组件的 `setup` 函数，函数体用于定义组件的逻辑。

以下是一个示例：

```vue-vine
function MyComponent(props: {
  testId: string
}) {
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

## 宏 {#macros}

随着 Vue 3.2 的发布，我们可以在 `<script setup>` 块中使用宏，而 [Vue Macros](https://vue-macros.sxzz.moe/) 将这个想法推向了极致，在 Vue 3.3 中，Vue 添加了更多内置宏。

在 Vine 中，我们目前只提供了一小部分宏，您可以在我们单独的 [宏](./macros.html) 章节中查看更多详细信息。我们保留了将来添加更多宏的可能性，但我们将谨慎地迈出每一步。
