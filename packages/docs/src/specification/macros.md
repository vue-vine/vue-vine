# Macros

Macros are some special functions that only have meaning in compile time, they're hints for Vine compiler to transform corresponding component properties.

This solution's basic idea is to use specific functions in the source code to make it easy to identify at compile time, and then transform it into any operation you want.

The type definition of these macros can be found in [our Github repo](https://github.com/vue-vine/vue-vine/blob/main/packages/vue-vine/types/macros.d.ts).

## `vineValidators` <VersionTip version="v0.4.0+" />

When using macros to define props, `vineProp` provides users with the ability to define validators.

But when defining props using type annotations of function parameters, you'll need to use this macro as the following example shows:

```vue-vine
function MyComponent(props: {
  foo: string,
  bar: number
}) {
  vineValidators({
    // The type of `val` is auto inferred from the props type
    foo: (val) => val.startsWith('vine:'),
    bar: (val) => val > 5,
  })

  return vine`...`
}
```

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

Also, you can just use an array of event names to define emits.

```vue-vine
const myEmit = vineEmits(['update', 'delete'])
```

Vue Vine will treat all events as **required** as default, but if you define with `?` suffix in type or names array, it will be treated as optional.

## `vineExpose`

This macro's usage is just the same with the official `defineExpose` macro.

Check the description in [corresponding secion](https://vuejs.org/api/sfc-script-setup.html#defineexpose) on Vue.js official documentaion.

### How to get component exposed type {#how-to-get-component-exposed-type}

If you get a component instance by `ref` in another component, and want to get the type of the exposed properties, you can do this:

```vue-vine
// a.vine.ts
function TargetComp() {
  const count = ref(0)
  vineExpose({
    count
  })

  return vine`...`
}

// b.vine.ts
function TestComp() {
  const target = ref<ReturnType<typeof TargetComp>>()
  console.log('target count: ', target.value?.count)

  return vine`
    <TargetComp ref="target" />
  `
}
```

For components that use the `vineExpose` macro to expose properties, its function return type is the type of the exposed properties, while the function without `vineExpose` does not have this feature.

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
import '~/styles/some-style.less'
```

But if you want it to be **`scoped`**, you can use `vineStyle` in this way:

```ts
vineStyle.import('~/styles/some-style.less').scoped()
```

it's equivalent to write the following code in Vue SFC.

```vue
<style scoped src="~/styles/some-style.less"></style>
```

## `vineModel`

`vineModel` can be used to define two-way binding for components. The usage is quite similar to the official [`defineModel`](https://vuejs.org/api/sfc-script-setup.html#definemodel).

```ts
// ✅ Correct usage:
const model = vineModel<string>() // explicitly give its type
const count = vineModel('count', { default: 0 }) // implicitly inferred type by default value

// ❌ Incorrect usage:
vineModel() // vineModel cannot be called directly without defining a variable
const model = vineModel() // No type parameter, the type of model is Ref<unknown>
const model = vineModel<number>(someStringAsName) // If you want to name the model, no variable! it must be a string literal.
// Other errors can be checked by TypeScript
```

To explain the working principle of `vineModel` more clearly, please see the following code:

```ts
// Declare "modelValue" prop, used by parent component with v-model
const myModel = vineModel<string>() // myModel's type is Ref<string>
// When it's modified, the "update:modelValue" event is triggered
myModel.value = 'hello'

// Declare "count" prop, used by parent component with v-model:count
const count = vineModel('count', { default: 0 }) // count's type is Ref<number>
// When it's modified, the "update:count" event is triggered
count.value++
```
