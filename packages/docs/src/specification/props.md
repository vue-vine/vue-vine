# Props

There're two ways to define props for VCF, the first one is giving TypeScript type annotation for function's first formal parameter, and another is using [`vineProp` macro](./macros.md#macros).

If you don't provide a formal parameter for the VCF, and no `vineProp` macro call inside the VCF as well, component's `props` field will be `{}`.

## Prop type

We decide to drop support for props' `type` field, because we hold the opinion that it's not quite useful when we already have TypeScript.

Vine will treat all props as **required** in default, you can use `?` to mark it optional.

```vue-vine
import { SomeExternalType } from './path/to/somewhere'

function MyComponent(props: {
  foo: SomeExternalType
  bar?: number // optional
  baz: boolean
}) { ... }
```

When you annotate one prop's type, it's analyzed by the current TypeScript context in your IDE environment. Vine lets IDE to take over the type checking, and we'll remove all the types when generating the component object's `props` field.

### Boolean cast

Vine indeed ignore the type of props, but there is a special case due to Vue's "Boolean Cast" mechanism, that said, in compile time, we must know whether a prop is a boolean or not, in order to determine how to handle a prop passing like this: `<MyComponent foo />`. In Web standard HTML, the value of attribute `foo` is actually an empty string.

So you must specify any boolean props with a literal `boolean` annotation.

```vue-vine
function MyComponent(props: {
  // ... other props
  foo: boolean
}) { ... }
```
