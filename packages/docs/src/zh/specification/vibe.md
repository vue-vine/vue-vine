# 什么是 Vibe

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
| 显式依赖 | ✅ | ✅ | ❌ | ✅ |

## 用法

### 创建数据仓库

Vibe 的英语单词意思是 “氛围”，选择这个名字我们希望创建一个在多个组件之间共享的数据仓库，在多个组件之间自由传递。

你可以从 `'vue-vine'` 中导入 `defineVibe` 函数，使用它来定义一个数据仓库。

::: tip

你可以配置 `unplugin-auto-import` 来自动导入 `defineVibe` 函数。

```ts [vite.config.ts]
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    AutoImport({
      imports: [
        {
          'vue-vine': ['defineVibe'],
        }
      ],
    }),
  ],
})
```

:::

```vue-vine
const [useCounterStore, initCounterStore] = defineVibe('counter', () => {
  const count = ref(0)
  const increment = () => {
    count.value++
  }
  return { count, increment }
})
```

如你所见，你需要提供给 `defineVibe` 两个参数：

1. 数据仓库的名字。不需要全局唯一，Vibe 会自动处理相关事宜，并且后续使用都是采用返回的工具方法，也不依赖这个名字。
2. 数据仓库的工厂函数。这个函数返回一个对象，这个对象就是数据仓库。你需要在这个工厂函数中定义好数据模型，包括各个状态以及修改状态的方法。

::: warning 注意

工厂函数返回的值不能是 Promise，Vibe 需要一个同步函数确立数据模型。

:::

`defineVibe` 的返回值是一对方法，第一个是 `useVibe` 方法，第二个是 `initVibe` 方法。之所以采用数组形式返回，是为了方便你在取用时可以直接命名，而不用像 `{ useVibe: useMyVibe, initVibe: initMyVibe }` 这样麻烦。

### 在顶层组件中初始化

Vibe 适用于状态需要在多层相关组件中共享传递数据的场景，因此你应该在最顶层组件中使用 `initVibe` 方法来初始化数据仓库。

```vue-vine
const [useProductStore, initProductStore] = defineVibe('products', () => {
  const productList = ref([])
  const fetchProducts = async () => {
    const resp = await fetch('...')
    productList.value = resp.data
  }
  return { productList, fetchProducts }
})

function App() {
  initProductStore(async () => {
    await fetchProducts()
  })

  return vine`...`
}
```

初始化数据仓库时，你可以不传参数直接调用，也可以传入一个函数作为初始化执行器，这个函数会接收数据仓库对象作为参数。

> 调用 `initProductStore` 这样的 Vibe 初始化方法，是为了使用 Vue 的 [`provide`](https://cn.vuejs.org/api/composition-api-dependency-injection.html#provide) API 将数据提供给下层组件。

我们强力推荐你在创建数据仓库模型时对状态都使用 `ref` 来定义，这样你就可以方便地在初始化执行器中从参数上解构出它们，而不会像 Pinia 那样丢失响应性。

::: warning 需要注意的细节

初始化执行器函数可以是异步的，Vue 和 Vine 在机制上并不会等待其执行完毕。

因此你应该对执行器中可能会更新的状态值保持警惕，在组件中使用时应该为其设置兜底方案，比如设置一个加载动画等视觉方案。

如果你坚持要在组件 `setup` 逻辑中等待这个 `initVibe` 方法执行完毕，你可以在前面加上 `await`，但这也意味着你的组件 `setup` 函数会变成异步的，Vue 要求你后续必须用 `Suspense` 组件包裹你的组件。

:::

### 在下层组件中使用

使用 `useVibe` 方法获取数据仓库对象，你可以自由地解构出你需要的状态值。

```vue-vine
function ProductList() {
  const { productList } = useProductStore()

  return vine`
    <div v-if="productList.length" class="product-list">
      <div v-for="product in productList" :key="product.id">
        <ProductCard :product="product" />
      </div>
    </div>
    <div v-else>
      <p>Loading ...</p>
    </div>
  `
}
```
