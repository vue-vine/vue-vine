import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'

type MaybePromise<T> = T | Promise<T>

type DefineVibeResult<T> = [
  useVibe: () => T,
  initVibe: (initFn?: (store: T) => MaybePromise<void>) => MaybePromise<void>,
]

function uniqueId() {
  const timestamp = String(Date.now())
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}

/**
 * Define a Vibe store.
 *
 * Vibe store is a mechanism provided by Vue Vine to manage states between multiple components.
 *
 * In Vue, we already have a few ways to manage states:
 * - **Pinia** :
 *
 *   - Suitable for: global, app-wide state like user auth, themes, shopping carts ...
 *   - Cons: overkill for small component trees
 *
 * - **Composables for reusable logic** :
 *
 *   - Suitable for: logic reuse across components (e.g. forms, modals, local storage ...)
 *   - Cons: state declared outside component scope persists between requests, causing memory buildup in SSR
 *
 * - **Provide/Inject** :
 *
 *   - Suitable for: library components or feature-specific configuration
 *   - Cons: can create implicit dependencies, debugging requires tracing providers
 *
 * These opinions are reference from [this article](https://alexop.dev/posts/solving-prop-drilling-in-vue/).
 *
 * Vibe is here to merge all the best parts of the above solutions.
 *
 * You can define a data store containing all states as refs and action methods.
 *
 * @example
 * ```ts
 * // ~/vibes/products-store.ts
 * const [useProductsStore, initProductsStore] = defineVibe('products-store', () => {
 *   const products = ref<Product[]>([])
 *   const fetchProducts = async () => {
 *     // ...
 *   }
 *   return { products, fetchProducts }
 * })
 *
 * export { useProductsStore, initProductsStore }
 * ```
 *
 * ```vue
 *
 * <!-- ~/components/App.vue -->
 * <script setup lang="ts">
 * import { initProductsStore } from '~/vibes/products-store'
 *
 * initProductsStore(async ({ fetchProducts }) => {
 *   await fetchProducts()
 * })
 * </script>
 *
 * <template>
 *   <ProductList />
 * </template>
 * ```
 *
 * ```vue
 *
 * <!-- ~/components/ProductList.vue -->
 * <script setup lang="ts">
 * const { products } = useProductsStore()
 * </script>
 *
 * <template>
 *   <template v-if="products.length">
 *     <div
 *       v-for="product in products"
 *       :key="product.id"
 *     >
 *       <ProductCard :product="product" />
 *     </div>
 *   </template>
 *   <p v-else>Loading...</p>
 * </template>
 * ```
 *
 * @param name - The name of the vibe store.
 * @param factory - The factory function that returns the vibe store.
 * @returns [useVibe, initVibe]
 */
export function defineVibe<T>(
  name: string,
  factory: () => T extends Promise<infer _> ? never : T,
): DefineVibeResult<T> {
  const key = Symbol(`vibe-${uniqueId()}:${name}`) as InjectionKey<T>

  const initVibe = (initFn?: (store: T) => MaybePromise<void>) => {
    const factoryResult = factory()
    provide(key, factoryResult)
    return initFn?.(factoryResult)
  }

  const useVibe = () => {
    const vibeStore = inject(key)
    if (!vibeStore) {
      throw new Error(`[Vue Vine] Vibe store '${name}' is not initialized!`)
    }
    return vibeStore
  }

  return [
    useVibe,
    initVibe,
  ]
}
