# Why Vibe

Vibe is a state management solution for Vue Vine.
Before Vine, you may have known several state management solutions for Vue, such as Pinia, Composable functions, Provide/Inject, etc.

This article from `@alexanderOpalic` [Solving Prop Drilling in Vue: Modern State Management Strategies](https://alexop.dev/posts/solving-prop-drilling-in-vue) compares the pros and cons of these solutions in detail, highly recommended to read.

In Vine, since we have the ability to manage multiple components in a single file, we hope to have a solution that combines the advantages of these solutions to manage states across multiple related components, and also make the editing experience simpler and more convenient, without always having to add and switch files.

## Advantages of Vibe

We compare the following features of the solutions:

> ✅ means no problem or support the feature.
>
> ❌ means there is a problem or does not support the feature

| Feature | Pinia | Composables | Provide/Inject | Vibe |
| -------- | ----- | ------------ | -------------- | ---- |
| DevTools | ✅ | ❌ | ❌ | ❌ |
| Directly destructuring | ❌ | ✅ | ✅ | ✅ |
| SSR memory leak | ✅ | ❌ | ✅ | ✅ |
| SSR-safe | ✅ | ❌ | ✅ | ✅ |
| Implicit dependency | ✅ | ✅ | ❌ | ✅ |
