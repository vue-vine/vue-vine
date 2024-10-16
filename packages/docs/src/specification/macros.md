# Macros

Macros are some special functions that only have meaning in compile time, they're hints for Vine compiler to transform corresponding component properties.

The type definition of these macros can be found in [our Github repo](https://github.com/vue-vine/vue-vine/blob/main/packages/vue-vine/types/macros.d.ts).

## `vineEmits`

Define `emits` for the component, the usage is quite similar to the official version.

This macro has zero parameter, and returns the emits function, you **must** define a variable to accept the return value.

This type parameter's syntax is the same as Vue 3.3's more succinct one, check the [official documentaion](https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits) for more details.

```vue-vine
const myEmit = vineEmits<{
  update: [foo: string, bar: number]
}>()

myEmit('update', 'foo', 1)
```

## `vineExpose`

This macro's usage is just the same with the official `defineExpose` macro.

Check the description in [corresponding secion](https://vuejs.org/api/sfc-script-setup.html#defineexpose) on Vue.js official documentaion.

## `vineSlots`

This macro's usage is just the same with the official `defineSlots` macro.

Check the description in [corresponding secion](https://vuejs.org/api/sfc-script-setup.html#defineslots) on Vue.js official documentaion.

## `vineOptions`

This macro only supports you to define 2 important Vue component options: `name` and `inheritAttrs`.

```vue-vine
vineOptions({
  name: 'MyComponent',
  inheritAttrs: false
})
```

## `vineStyle`

:::tip 🧩 Suggestion
Due to the fact that style code can be very long to write, we as library authors actually don't recommend using this macro, but recommend you to use atomic CSS solutions like [UnoCSS](https://unocss.dev), [TailwindCSS](https://tailwindcss.com), or import external stylesheets.
:::

It's a macro for defining styles, alternative to SFC's `<style>` block. If you need `scoped` for your component, you can use `vineStyle.scoped` instead.

`vineStyle` is not allowed to be called outside a VCF, but it's allowed to be called more than once in a VCF, because you may want to provide both scoped and non-scoped styles in a component.

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

If you're going to import an external style file, you may include it like this:

```ts
import "~/styles/some-style.less"
```

But if you want it to be **`scoped`**, you can use `vineStyle` in this way:

```ts
vineStyle.import('~/styles/some-style.less').scoped()
```

it's equivalent to write the following code in Vue SFC.

```vue
<style scoped src="~/styles/some-style.less"></style>
```
