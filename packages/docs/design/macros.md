# Macros

Macros are some special functions that only has meaning for compile time, they're hints for Vine compiler to transform corresponding component properties.

The type definition of these macros can be found in [our Github repo](https://github.com/vue-vine/vue-vine/blob/main/packages/vue-vine/types/macros.d.ts).

## `vineProp`

Define a component prop. it's inspired from [Vue Macros](https://vue-macros.sxzz.moe/macros/define-prop.html), but with some differences:

- For props doesn't need a default value, you must pass a type argument to it.
- `vineProp`'s first parameter is the prop's validator, it's optional.

```ts
const foo = vineProp<string>()
const title = vineProp<string>(value => value.startsWith('#'))
```

- For props with default value, you can use `vineProp.withDefault`, and the validator becomes the second parameter.

  Because of the ability of TypeScript to infer the type of the default value, you don't need to pass the type argument to it, except any `boolean` type default value, which is an restriction from Vue's "Boolean Cast" mechanism. 
  
  Further more, when you need a boolean prop, it's not allowed to pass a `boolean` variable as default value, but only `true` or `false` literal. Although TypeScript can infer from that variable, but Vine compiler doesn't embed a TypeScript compiler, so it's not possible to get that information.

```ts
const foo = vineProp.withDefault('bar')
const bool = vineProp.withDefault(false)
```

## `vineEmits`

Define `emits` for the component, the usage is quite similar to the official version.

This macro has zero parameter, and returns the emits function, you **must** define a variable to accept the return value.

```ts
const myEmits = vineEmits<{
  update: [foo: string, bar: number]
}>()

myEmits('update', 'foo', 1)
```

## `vineExpose`

This macro is just an alias of the official `defineExpose` macro, with the same usage.

Check the description in [corresponding secion](https://vuejs.org/api/sfc-script-setup.html#defineexpose) on Vue.js official documentaion.

## `vineOptions`

This macro only supports you to define 2 important Vue component options: `name` and `inheritAttrs`.

```ts
vineOptions({
  name: 'MyComponent',
  inheritAttrs: false
})
```

## `vineStyle`

Todo ...