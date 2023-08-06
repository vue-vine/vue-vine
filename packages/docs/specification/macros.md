# Macros

Macros are some special functions that only have meaning in compile time, they're hints for Vine compiler to transform corresponding component properties.

The type definition of these macros can be found in [our Github repo](https://github.com/vue-vine/vue-vine/blob/main/packages/vue-vine/types/macros.d.ts).

## `vineProp`

Define a component prop. it's inspired from [Vue Macros](https://vue-macros.sxzz.moe/macros/define-prop.html), but with some differences:

- You must give a type argument to specify the type of the prop, or you must provide a default value.
- `vineProp`'s first parameter is the prop's validator, it's optional.

```vue-vine
const foo = vineProp<string>()
const title = vineProp<string>(value => value.startsWith('#'))
```

- For props with default value, you can use `vineProp.withDefault`, and the validator is the second parameter.

  Because of the ability of TypeScript to infer the type of default value, you don't need to pass the type argument to it.

  Except any `boolean` type default value, if you really need a boolean prop, you shouldn't pass a variable but only a `true` or `false` literal. Although TypeScript can infer from variable, but Vine compiler doesn't embed a TypeScript compiler, so it's not possible to get that information.

```vue-vine
// Correct examples
const foo = vineProp.withDefault('bar')
const bool = vineProp.withDefault(false)
```

## `vineEmits`

Define `emits` for the component, the usage is quite similar to the official version.

This macro has zero parameter, and returns the emits function, you **must** define a variable to accept the return value.

```vue-vine
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

```vue-vine
vineOptions({
  name: 'MyComponent',
  inheritAttrs: false
})
```

## `vineStyle`

It's a macro for defining styles, alternative to SFC's `<style>` block. If you need `scoped` for your component, you can use `vineStyle.scoped` instead.

`vineStyle` is not allowed to be called outside a VCF, and it's not allowed to be called more than once in a VCF.

You can also specify any CSS processor language you want, check the examples below:

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
