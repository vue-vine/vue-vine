# Props

The original way to define props type in Vue is using type constructor such as `String`, `Number`, `Boolean`, etc, this is used for Vue's runtime type checking.

But since Vue 3 the type checking process is more expected to be done by TypeScript and IDE side, so we decide to drop support for props' `type` field, because we hold the opinion that it's not quite useful when we already all-in TypeScript.

Vine will remove all the types when generating the component object's `props` field.

There're two ways to define props for VCF, the first one is giving TypeScript type annotation for function's first formal parameter, and another is using [`vineProp` macro](./macros.md#macros).

If you don't provide a formal parameter for the VCF, and no `vineProp` macro call inside the VCF as well, component's `props` field will be `{}`.

## Using type annotation to define

If you want to define props on a VCF parameter, it should be the first one, and write a TypeScript Object literal type annotation for it, with all the props you want to define.

In this style, Vine will treat all props as **required** in default, you can use `?` to mark it optional.

```vue-vine
import { SomeExternalType } from './path/to/somewhere'

function MyComponent(props: {
  foo: SomeExternalType
  bar?: number // optional
  baz: boolean
}) { ... }
```

In this props type annotation, you can use any TypeScript type, even it's imported from another module or file.

But there's a special case for boolean props, see below:

### Boolean cast mechanism

In compile time, we must know whether a prop is a boolean or not, in order to determine how to handle a prop passing like this: `<MyComponent foo />`. In Web standard HTML, the value of attribute `foo` is actually an empty string.

So you must specify any boolean props with a **literal** `boolean` annotation, it's not allowed to use other named type here even it's finally computed to a boolean.

```vue-vine
function MyComponent(props: {
  // ...
  isFrontEnd: boolean
  isBackEnd: OtherTypeButActuallyBoolean
}) { ... }
```

## `vineProp`

This is a macro for defining a single component prop. it's inspired from [Vue Macros](https://vue-macros.sxzz.moe/macros/define-prop.html), but with some differences:

- You must give a type argument to specify the type of the prop, or you must provide a default value.
- If you want to define an optional prop, please use `vineProp.optional`.

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

As we said in the "Boolean cast mechanism" section above, you should also notice that when you do need a boolean prop, the type parameter should be a literal `boolean`, and you should not pass a variable as default value, but only `true` or `false` literals. Although TypeScript can infer from the variable, but Vine compiler doesn't embed TypeScript compiler to know this prop is boolean.

```vue-vine
// Correct examples
const foo = vineProp.withDefault('bar')
const bad = vineProp.withDefault(someStringVariable)
const bool = vineProp.withDefault(false)

// Incorrect examples
const bad1 = vineProp<SomeBooleanType>()
const bad2 = vineProp.withDefault(someBooleanVariable)
```
