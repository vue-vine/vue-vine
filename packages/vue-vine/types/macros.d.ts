import type { Ref } from 'vue'

declare const __VUE_VINE__: unique symbol
declare const __VUE_VINE_STYLE__: unique symbol

type IsEmptyObj<T> = keyof T extends never ? true : false

declare global {
  interface VueVineComponent { [__VUE_VINE__]: true }
  interface VineStyle { [__VUE_VINE_STYLE__]: true }

  type VineEmitsDefineSource = Record<string, any[]>
  type VineEmitsDefineResult<D extends VineEmitsDefineSource> = IsEmptyObj<D> extends true
    ? never
    : <E extends keyof D>(
        eventName: E,
        ...args: D[E]
      ) => void

  type VinePropValidator<T> = (value: T) => boolean
  interface VinePropMacro {
    <T>(validator?: VinePropValidator<T>): Readonly<Ref<T>>
    optional: <T>(validator?: VinePropValidator<T>) => Readonly<Ref<T>>
    withDefault: <T>(value: T, validator?: VinePropValidator<T>) => Readonly<Ref<T>>
  }

  interface VineStyleMacro {
    (style: string | VineStyle): void
    scoped: (style: string | VineStyle) => void
    import: {
      (path: string): void
      scoped: (path: string) => void
    }
  }

  interface VineOptionsDef {
    name?: string
    inheritAttrs?: boolean
  }

  interface VineEmitsFn {
    <E extends string>(events: E[]): VineEmitsDefineResult<Record<E, any[]>>
    <D extends VineEmitsDefineSource>(): VineEmitsDefineResult<D>
  }

  const vineProp: VinePropMacro

  const vineEmits: VineEmitsFn

  const vineSlots: <D extends Record<string, (props: any) => any>>() => D
  const vineExpose: (exposed: Record<string, any>) => void
  const vineOptions: (options: VineOptionsDef) => void

  function vineValidators<P = unknown>(
    validators: Partial<{
      [K in keyof P]: VinePropValidator<P[K]>
    }>,
  ): void

  // vineModel options type
  interface VineModelOptions<T> {
    default?: T
    required?: boolean
    get?: (v: T) => any
    set?: (v: T) => any
  }

  // vineModel return type that supports both direct usage and destructuring
  type VineModelReturn<T, M extends string = string> = Ref<T> & [Ref<T>, Record<M, true | undefined>]

  function vineModel<T, M extends string = string>(): VineModelReturn<T, M>
  function vineModel<T, M extends string = string>(
    modelOptions: VineModelOptions<T>
  ): VineModelReturn<T, M>
  function vineModel<T, M extends string = string>(
    modelName: string,
    modelOptions?: VineModelOptions<T>
  ): VineModelReturn<T, M>

  function vineCustomElement(): void

  /**
   * Define a code block that should be executed on Lynx's main thread (UI thread).
   *
   * This macro is used for Lynx platform support, allowing developers to write
   * code that needs to run on the main thread for performance-critical UI operations.
   *
   * Note: The function passed to this macro should be **synchronous** (not async),
   * as PrimJS main thread requires fast execution for UI responsiveness.
   * If you need to get a return value, the call will be async (returns Promise).
   *
   * @param fn - A synchronous function containing the main thread code
   *
   * @example
   * ```ts
   * function App() {
   *   // Simple usage without return value
   *   vineLynxRunOnMainThread(() => {
   *     // This code will be extracted and run on Lynx main thread
   *     // You can use Lynx Element PAPI here
   *     __SetClasses(el, 'active')
   *   })
   *
   *   // With return value (async call)
   *   const getValue = vineLynxRunOnMainThread(() => {
   *     return someMainThreadValue
   *   })
   *   // Call: const result = await getValue()
   *
   *   return vine`<view>...</view>`
   * }
   * ```
   */
  function vineLynxRunOnMainThread<R = void>(fn: () => R): () => Promise<R>

  const vineStyle: VineStyleMacro

  const vine: (template: TemplateStringsArray) => VueVineComponent

  // CSS lang types helpers
  const css: (style: TemplateStringsArray) => VineStyle
  const scss: (style: TemplateStringsArray) => VineStyle
  const sass: (style: TemplateStringsArray) => VineStyle
  const less: (style: TemplateStringsArray) => VineStyle
  const stylus: (style: TemplateStringsArray) => VineStyle
  const postcss: (style: TemplateStringsArray) => VineStyle
}

export {}
