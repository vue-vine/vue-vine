# 为什么提供 Vibe

Vibe 是一种在 Vue Vine 中所推荐的状态管理代码组织方式。在此之前，你或许已经知道了几种 SFC 语境下的状态管理方案，比如 Pinia、可组合函数（Composbles）、Provide/Inject 等。

这篇来自 `@alexanderOpalic` 的博客 [Solving Prop Drilling in Vue: Modern State Management Strategies](https://alexop.dev/posts/solving-prop-drilling-in-vue) 详细对比了这几种方案的优缺点，非常值得一读。

在 Vine 当中，由于我们拥有了在一个文件中管理多个组件的能力，那为了让编辑体验更简单、不需要总是新增和切换文件，我们希望能有一种方案综合一下上述几种方案的优点，更好地适配 Vine 横跨多个相关组件之间的状态管理。

## Vibe 的优势

我们通过以下几个功能需求来横向对比一下几种方案：

> ✅ 表示没有问题或支持该功能。
>
> ❌ 表示存在缺陷或不支持该功能

| 功能需求 | Pinia | 可组合函数 | Provide/Inject | Vibe |
| -------- | ----- | ------------ | -------------- | ---- |
| DevTools | ✅ | ❌ | ❌ | ❌ |
| 可以直接解构 | ❌ | ✅ | ✅ | ✅ |
| SSR 内存泄漏 | ✅ | ❌ | ✅ | ✅ |
| SSR 状态污染 | ✅ | ❌ | ✅ | ✅ |
| 隐式依赖 | ✅ | ✅ | ❌ | ✅ |
