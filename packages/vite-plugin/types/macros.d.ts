import type { Ref } from 'vue'

declare const __VUE_VINE__: unique symbol
declare const __VUE_VINE_STYLE__: unique symbol

declare type VueVineComponent = { [__VUE_VINE__]: true }
declare type VineStyle = { [__VUE_VINE_STYLE__]: true }

type IsEmptyObj<T> = keyof T extends never ? true : false;

type VineEmitsDefineSource = Record<string, any[]>
type VineEmitsDefineResult<D extends VineEmitsDefineSource> = IsEmptyObj<D> extends true 
  ? never : 
  {
    [K in keyof D]: (evt: K, ...args: D[K]) => void
  }[keyof D]

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

declare global {
  const vineProp: VinePropMacro;
  const vineEmits: <D extends Record<string, any[]> = {}>() => VineEmitsDefineResult<D>
  const vineExpose: (exposed: Record<string, any>) => void
  const vineOptions: (options: VineOptionsDef) => void
  
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
