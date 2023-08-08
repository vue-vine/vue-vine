# 注意事项 {#caveats}

尽管 `.vine.ts` 是一个有效的 TypeScript 文件，但仍然有一些注意事项需要遵循。

### 限制的 TypeScript 使用场景 {#restricted-typescript-use-case}

- 所有宏只允许在 VCF 内部调用。

- 在顶层作用域中：

  - 不允许使用表达式语句，因为它可能引起副作用。
  - 不允许在顶层声明中调用任何 Vue 响应性 API。

对于以下所有示例，我们假设它们都在顶层作用域中。

以下用法是不正确的：

```vue-vine
// 裸的表达式语句
1 + some_func();
new SomeClass()

// 使用 Vue 响应性 API
const foo = ref(0)
const bar = computed(() => foo.value + 1)
```
正如您所见，顶层作用域不允许调用任何内含响应性 API 调用的函数。

但是编译器无法检测到这一点，因此您有责任避免这种情况。

相应地，以下代码是允许的：

```vue-vine
// 简单的常量
const WIDTH = 100

// 调用没有副作用的函数是允许的。
// 但编译器无法检测到它，
// 所以您有责任保证它没有副作用。
const result = func_with_no_side_effects()

// 定义一个包含响应性 API 调用的函数是允许的，
// 因为这就是我们构建“Vue 组合式 API”的方式。
const valid_vue_composable = () => {
  const count = ref(0)
  const inc = () => count.value += 1
  const dec = () => count.value -= 1
  return { count, inc, dec }
}
```
