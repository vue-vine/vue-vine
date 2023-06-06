---
outline: deep
---

# Specification

Before start using it, you're supposed to know the following conventions:

- Vine was designed to only support Vue 3 and Vite. 
- Vine only supports TypeScript, JavaScript users may not have a good experience.
- Vine targets to ESM only, `require` is not supported.

## File extension

Vine uses `.vine.ts` as the file extension, so you know that you're actually writing TypeScript, any valid grammar in TypeScript is also valid for Vine.

## Vine component function

Vine component function is a function that returns a tagged template string, which gives the component's template.

```vue-vine
function MyComponent() {
  return vine`<div>Hello World</div>`
}
```

We'll call it **"VCF"** in the rest of this documentation.

Vine compiler will transform this kind of function into a Vue component object in underhood. **So you're supposed to treat it as a not-callable function.**

### setup

You can treat the VCF itself as Vue component's `setup` function, it's the place where you can define your component's logic.

```vue-vine
function MyComponent() {
  const num = ref(0)
  const randomPick = () => {
    num.value = Math.floor(Math.random() * 10)
  }

  return vine`
    <div>
      <button>Pick</button>
      <div>{{ num.value }}</div>
    </div>
  `
}
```

All the statements would be extracted to the actual component object's `setup` function, except the return statement, and anyone has a **Macro** call, which will be explained below.

### Macros

In Vine, we just provide a small amount of macros, you can check more details in our separated [Macros](/design/macros.html) chapter.

### Props

There're two ways to define props for VCF, the first one is giving TypeScript type annotation for function's first formal parameter, and another is using `vineProp` macro.

We decide to drop support for props' `type` field, because we hold the opinion that it's not quite useful when we already have TypeScript.

In addition, Vine will treat all props as **required** in default, you can use `?` to mark it optional.

```vue-vine
import { SomeExternalType } from './path/to/somewhere'

function MyComponent(props: {
  foo: SomeExternalType
  bar: boolean
}) {
  // ...
}
```

When you annotate one prop's type, no matter where it's defined. Vine will transfer type checking to IDE side, and we'll drop all the types when generating the component object's props.

That opinionated behavior is by design at the beginning of my design. Vue 3.3 add a self-implemented type checking to do analysis, but it's no doubt that there will be many unexpected edge cases in the future.

You **must** specify any boolean props with a literal `boolean` annotation, just like what we'll talk about later in the [`vineProp` section](/design/macros#vineprop).

In a nutshell, if you don't provide a formal parameter for the VCF, and no `vineProp` macro call inside the VCF as well, the props will be `{}`.

## Caveats

### Conflicted with SFC

Vine is not designed to work with SFC, it's a parallel style to SFC. You should not use SFC and Vine in the same project.

That's because we define Vue component as function in Vine, it's not type compatible when using a VCF inside a SFC as a component.

### Restricted TypeScript use case

Although we use TypeScript, we still have some restrictions inside `.vite.ts` files:

- All macros are only allowed to show inside Vine component function.

- In top-leve scope:
  - Expression statement are not allowed, because it may cause side effects.
  - Any Vue reactivity API call is not allowed in declarations.
