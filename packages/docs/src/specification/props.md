# Props

Maybe you started to learn how to define props type in Vue by using type constructors like `String`, `Number`, `Boolean`, etc, this is used for Vue's runtime type checking. In fact, Vue only cares about what the props' name is, to better distinguish from normal attributes. Even you provide types for runtime to check, it will only report a warning instead of throwing an exception to interrupt the program.

But since Vue 3 the type checking process is more expected to be done by TypeScript and IDE side, so we decide to drop support for props' `type` field in runtime, because we hold the opinion that it's not quite useful when we're already all-in TypeScript.

::: warning 💡 Mention

Vine will remove all the types when generating the component object's `props` field, totally abandon the process of runtime type checking.

:::

There're two ways to define props for VCF, the first one is giving TypeScript type annotation for function's first formal parameter, and another is using [`vineProp` macro](./macros.md#macros).

If you don't provide a formal parameter for the VCF, and no `vineProp` macro call inside the VCF as well, component's `props` field will be `{}`.

## Using type annotation to define

If you want to define props on a VCF parameter, it should be the first one, and write a TypeScript Object literal type annotation for it, with all the props you want to define.

In this style, Vine will treat all props as **required** in default, you can use `?` to mark it optional.

```vue-vine
import { SomeExternalType } from '../path/to/somewhere'

function MyComponent(props: {
  foo: SomeExternalType
  bar?: number // optional
  baz: boolean
}) { ... }
```

### Destructure `props` parameter

Since Vue Vine v0.3.0, you can destructure the `props` parameter, and use the destructured variables to access a single prop or a subset of props.

```vue-vine
function MyComponent({ foo, bar, ...rest }: {
  foo: string,
  bar?: number,
  other1: boolean,
  other2: string
}) {

  watchEffect(() => {
    console.log(
      'foo: ', foo,
      ', bar: ', bar,
      ', rest: ', rest
    )
  })

  return vine`...`
}
```

The code above will be transformed to the following equivalent code:

```js
import { createPropsRestProxy as _createPropsRestProxy } from 'vue'

// ...

const rest = _createPropsRestProxy(props, ['foo', 'bar'])
watchEffect(() => {
  console.log(
    'foo: ',
    props.foo,
    ', bar: ',
    props.bar,
    ', rest: ',
    rest
  )
})

// ...
```

Such destructuring syntax is equivalent to Vue 3.5's [Reactive Props Destructure](https://vuejs.org/api/sfc-script-setup.html#reactive-props-destructure).

Also, you can use the destructured variables to define props' default values, like this:

```vue-vine
function MyComponent({
  foo = 'foo',
  bar = 1
}: SomeType) {
  // ...
}
```

### Using more complex type

Since Vue Vine v0.2.0, we introduced [ts-morph](https://github.com/dsherret/ts-morph) to resolve props type annotation, so you're able to use any type instead of only `TSTypeLiteral`.

```vue-vine
import type { SomeExternalType } from '../path/to/somewhere'

function MyComponent(props: SomeExternalType) {
  // ...
  return vine`...`
}
```

If you found any bad case, [please raise an issue](https://github.com/vue-vine/vue-vine/issues/new).

Additionally, there's one special case for boolean props, see below:

::: warning 💡 Mention

ts-morph in Vue Vine is enabled on demand, it's not enabled by default when you declared your props type in `TSTypeLiteral`. But if your props type contains generic type parameters, ts-morph will be enabled automatically.

:::

### Boolean cast mechanism

In compile time, we must know whether a prop is a boolean or not, in order to determine how to handle a prop passing like this: `<MyComponent foo />`. In Web standard HTML, the value of attribute `foo` is actually an empty string.

So when you're using object literal type annotation for props, you must specify any boolean props with a **literal** `boolean` annotation, it's not allowed to use other named type here even it's finally computed to a boolean.

For ts-morph analysis case i.e. `props: SomeTypeName`, it'll automatically infer if some prop is boolean or not, but we can't guarantee the correctness, if you found any bad case, [please raise an issue](https://github.com/vue-vine/vue-vine/issues/new).

```vue-vine
function MyComponent(props: {
  // ...
  isFrontEnd: boolean
  isBackEnd: OtherTypeButActuallyBoolean
}) { ... }
```

::: info 💡 Suggestion

To make our resolution more easier, we highly recommend you to write a prop's type as simple as possible, avoid using very complicated type gymnastics.

:::

## `vineProp`

This is a macro for defining a single component prop. it's inspired from [Vue Macros](https://vue-macros.sxzz.moe/macros/define-prop.html), but with some differences:

- You must give a type argument to specify the type of the prop, or you must provide a default value.
- If you want to define an optional prop, please use `vineProp.optional`, if you define with `vineProp.withDefault`, it will also be treated as optional.

```vue-vine
const foo = vineProp.optional<string>()
```

- `vineProp`'s first parameter is the prop's validator, it's optional.

```vue-vine
const foo = vineProp<string>()
const title = vineProp<string>(value => value.startsWith('#'))
```

- For props with default value, you can use `vineProp.withDefault`, and the validator is the second parameter.

  Because of the ability of TypeScript to infer the type of default value, you don't need to pass the type argument to it.

- You should be aware of boolean props as well, see more complete examples below:

```vue-vine
const foo = vineProp.withDefault('bar') // Default value can be automatically inferred
const biz = vineProp.withDefault(someStringVariable) // Default value can be automatically inferred

// Explicitly specify as boolean
const dar = vineProp<boolean>()
const bool = vineProp.withDefault(false)

// Infer complex type
const bad1 = vineProp<SomeBooleanType>() // Vine compiler uses ts-morph to infer the type is boolean
const bad2 = vineProp.withDefault(someBooleanVariable) // Vine compiler uses ts-morph to infer the type is boolean
```
