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
| Explicit dependency | ✅ | ✅ | ❌ | ✅ |

## Usage

### Create Data Store

Vibe is for creating a data store that can be shared between multiple components, like waves that can be passed freely between components.

You can import the `defineVibe` function from `vue-vine` to define a data store.

::: tip

You can configure in `unplugin-auto-import` to automatically import the `defineVibe` function.

```ts
// vite.config.ts
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

As you can see, you need to provide two parameters to `defineVibe`:

1. The name of the data store. It doesn't need to be globally unique, Vine will handle it under the hood, and you just need those two returned methods and don't need to care about this name any more.
2. The factory function of the data store. This function returns an object, which is the data store. You need to define the data model in this factory function, including the status and the methods to modify the status.

::: warning Notice

The value returned by the factory function cannot be a Promise, Vine needs a synchronous function to establish the data model.

:::

The returned value is a pair of methods, the first is the `useVibe` method, and the second is the `initVibe` method. The reason for using array is to make it convenient to name these methods, instead of `{ useVibe: useMyVibe, initVibe: initMyVibe }` which is a little bit annoying.

### Initialize Data Store

Vibe is suitable for scenarios where the state needs to be shared and passed between multiple related components. Therefore, you should use the `initVibe` method in the top-level component to initialize the data store.

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

When initializing the data store, you can call it directly without parameters, or pass in a function as the initial value.

> Calling `initProductStore` like this is to use Vue's [`provide`](https://cn.vuejs.org/api/composition-api-dependency-injection.html#provide) API to provide the data to the lower-level components.

We strongly recommend that you use `ref` to define the state in the data store model, so you can easily destructure them from the parameters in the initialization executor and avoid losing reactivity like Pinia.

::: warning Details aware

The initialization executor function can be asynchronous, Vue and Vine will not wait for it to execute.

Therefore, you should be vigilant about the status values that may be updated in the executor, and set up fallback plans in the component, such as a loading animation to wait.

If you insist on waiting for this `initVibe` method to be done in the component `setup` logic, you can `await` it, but this also means that your component `setup` function will become asynchronous, then Vue requires you to wrap your component with the `Suspense` component later.

:::

### Use in lower-level components

Use the `useVibe` method to get the data store object, you can easily destructure the status values you need.

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
