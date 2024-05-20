import type { Ref } from 'vue'

declare const __VUE_VINE__: unique symbol
declare const __VUE_VINE_STYLE__: unique symbol

declare interface VueVineComponent { [__VUE_VINE__]: true }
declare interface VineStyle { [__VUE_VINE_STYLE__]: true }

type IsEmptyObj<T> = keyof T extends never ? true : false

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
}

interface VineOptionsDef {
  name?: string
  inheritAttrs?: boolean
}

interface VineEmitsFn {
  <E extends string>(events: E[]): VineEmitsDefineResult<Record<E, any[]>>
  <D>(): VineEmitsDefineResult<D>
}

declare global {
  const vineProp: VinePropMacro

  const vineEmits: VineEmitsFn

  const vineSlots: <D extends Record<string, (props: any) => any>>() => D
  const vineExpose: (exposed: Record<string, any>) => void
  const vineOptions: (options: VineOptionsDef) => void

  function vineModel<T>(): Ref<T>
  function vineModel<T>(modelOptions: {
    default?: T
    required?: boolean
  }): Ref<T>
  function vineModel<T>(
    modelName: string,
    modelOptions?: {
      default?: T
      required?: boolean
    }
  ): Ref<T>

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
