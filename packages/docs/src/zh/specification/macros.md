# 宏函数 {#macros}

宏是一些特殊的函数，它们只在编译时具有意义，它们是 Vine 编译器转换相应组件属性的提示。

这一解决方式的基本思想就是通过在源代码中使用特定的函数，方便在编译期识别出来，然后转换成想要的任何操作。

这些宏的类型定义可以在 [我们的 Github 仓库](https://github.com/vue-vine/vue-vine/blob/main/packages/vue-vine/types/macros.d.ts) 中找到。

## `vineEmits` {#vineemits}

为组件定义 `emits`，用法与官方版本基本一致。

该宏没有参数，并返回 emits 函数，您**必须**定义一个变量来接收返回值。

这个类型参数的语法与 Vue 3.3 更简洁的语法相同，请查阅[官方文档](https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits)了解更多细节。

```vue-vine
const myEmit = vineEmits<{
  update: [foo: string, bar: number]
}>()

myEmit('update', 'foo', 1)
```

另外，您也可以使用事件名称数组来定义 emits。

```vue-vine
const myEmit = vineEmits(['update', 'delete'])
```

Vue Vine 将会默认将所有事件视为 **必需** 的，但如果您在类型中使用 `?` 后缀或使用事件名称数组定义，它将被视为可选。
## `vineExpose` {#vineexpose}

这个宏的使用方法与官方 `defineExpose` 宏完全一致。

请在 Vue.js 官方文档的[相应部分](https://cn.vuejs.org/api/sfc-script-setup.html#defineexpose)中查看描述。

### 如何获得组件暴露的属性类型 {#how-to-get-component-exposed-type}

若你在其他组件中通过 `ref` 获取到了一个组件实例，并想要获得该组件暴露的属性类型，可以这样做：

```ts
// a.vine.ts
function TargetComp() {
  const count = ref(0)
  vineExpose({
    count
  })

  return vine`...`
}

// b.vine.ts
const target = ref<ReturnType<typeof TargetComp>>()
console.log('target count: ', target.value?.count)
```

对于使用了 `vineExpose` 暴露属性的组件，其函数返回值类型就是所暴露的类型，而没有使用这个宏的函数则不具有此特性。


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

:::tip 🧩 建议
由于样式代码一写起来就会非常长，因此其实作者并不推荐使用这个宏，而是推荐你采用类似 [UnoCSS](https://unocss.dev)、[TailwindCSS](https://tailwindcss.com) 等原子化 CSS 方案或是导入外部样式表。
:::

这是一个用于定义样式的宏，替代了 SFC 的 `<style>` 块。如果您的组件需要 `scoped`，可以使用 `vineStyle.scoped`。

在 VCF 外部不允许调用 `vineStyle`，在一个 VCF 中可以调用多次，因为你可能在组件中想要同时提供 scoped 和非 scoped 样式。

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

如果你希望引入一个外部的样式文件，可能你会选择如下的方式：

```ts
import '~/styles/some-style.less'
```

但如果你想要该样式文件是带 **`scoped`** 作用的，可以这样使用 `vineStyle` 宏：

```ts
vineStyle.import('~/styles/some-style.less').scoped()
```

它等价于在 SFC 中这样写：

```vue
<style scoped src="~/styles/some-style.less"></style>
```

## `vineModel` {#vinemodel}

`vineModel` 可以非常便捷地为组件定义双向绑定。用法和 Vue 3.4 之后支持的 [`defineModel`](https://cn.vuejs.org/api/sfc-script-setup.html#definemodel) 基本一致。

```ts
// ✅ 正确用法：
const model = vineModel<string>() // 显式给出类型
const count = vineModel('count', { default: 0 }) // 通过默认值隐式推断类型

// ❌ 错误用法：
vineModel() // vineModel 不可以直接裸调用而不定义变量
const model = vineModel() // 没有类型参数，得到的 model 的类型是 Ref<unknown>
const model = vineModel<number>(someStringAsName) // 若要为 model 取名，不可以使用变量而必须是字符串字面量
// 其他错误可由 TypeScript 检查得到
```

为了更明确地解释 `vineModel` 的工作原理，请看下面这段代码：

```ts
// 声明 "modelValue" prop，由父组件通过 v-model 使用
const myModel = vineModel<string>() // myModel 的类型是 Ref<string>
// 在被修改时，触发 "update:modelValue" 事件
myModel.value = 'hello'

// 声明 "count" prop，由父组件通过 v-model:count 使用
const count = vineModel('count', { default: 0 }) // count 的类型是 Ref<number>
// 在被修改时，触发 "update:count" 事件
count.value++
```
