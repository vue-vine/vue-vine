/**
 * Internal types for Vue Vine virtual code generation
 * These types are used by the language service to generate correct TypeScript definitions
 */

declare const VUE_VINE_COMPONENT: unique symbol

type StrictIsAny<T> = [unknown] extends [T]
  ? ([T] extends [unknown] ? true : false)
  : false

type OmitAny<T> = {
  [K in keyof T as StrictIsAny<T[K]> extends true ? never : K]: T[K]
}

type MakeVLSCtx<T extends object>
  = & T
    & import('vue').ComponentPublicInstance

declare const CreateVineVLSCtx: <T>(ctx: T) => MakeVLSCtx<import('vue').ShallowUnwrapRef<T>>

type VueVineComponent = import('vue/jsx-runtime').JSX.Element & { [VUE_VINE_COMPONENT]: true }

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

type RecordToUnion<T extends Record<string, any>> = T[keyof T]

type VueDefineEmits<T extends Record<string, any>> = UnionToIntersection<Exclude<RecordToUnion<{
  [K in keyof T]: (evt: K, ...args: Exclude<T[K], undefined>) => void;
}>, undefined>>

type PickComponentExpose<F extends (...args: any[]) => any> = ReturnType<F> extends VueVineComponent & {
  exposed: infer E
} ? (exposed: E) => void : never

type VineComponentCommonProps = import('vue').HTMLAttributes & {
  key?: PropertyKey
  ref?: string | import('vue').Ref | ((ref: Element | import('vue').ComponentPublicInstance | null, refs: Record<string, any>) => void)
}

export type {
  MakeVLSCtx,
  OmitAny,
  PickComponentExpose,
  RecordToUnion,
  StrictIsAny,
  UnionToIntersection,
  VineComponentCommonProps,
  VueDefineEmits,
  VueVineComponent,
}

export {
  CreateVineVLSCtx,
  VUE_VINE_COMPONENT,
}
