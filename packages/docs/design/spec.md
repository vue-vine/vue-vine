---
outline: deep
---

# Specification

Before start using it, you're supposed to know the following conventions:

- Vine was designed to only support Vue 3 and Vite.
- Vine only supports TypeScript, JavaScript users may not have full experience.
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
      <div>{{ num }}</div>
    </div>
  `
}
```

All the statements would be extracted to the actual component object's `setup` function, except the return statement, the return value would be used as the component's template, and be compiled to render function by Vue.

### Macros

With Vue 3.2 wa released, we can use macros in `<script setup>` block, and [Vue Macros](https://https://vue-macros.sxzz.moe/) pushed the idea to the extreme, in Vue 3.3, Vue added more built-in macros.

In Vine, we just provide a small amount of macros for now, you can check more details in our separated [Macros](/design/macros.html) chapter. We keep the possibility to add more macros in the future, but every step would be discussed carefully.

### Props

There're two ways to define props for VCF, the first one is giving TypeScript type annotation for function's first formal parameter, and another is using `vineProp` macro.

We decide to drop support for props' `type` field, because we hold the opinion that it's not quite useful when we already have TypeScript.

In addition, Vine will treat all props as **required** in default, you can use `?` to mark it optional.

```vue-vine
import { SomeExternalType } from './path/to/somewhere'

function MyComponent(props: {
  foo: SomeExternalType
  bar?: number
  baz: boolean
}) {
  // ...
}
```

<details>
  <summary style="cursor: pointer;">
When you annotate one prop's type, it's analyzed by the current TypeScript context in your IDE environment. Vine lets IDE to take over the type checking, and we'll eliminate all the types when generating the component object's <code>props</code>.
  </summary>

<i style="color: #6b6b6bc1;">
That opinionated behavior is by design from the beginning. Vue 3.3 add a self-implemented computation under the hood to analyze type, but it's no doubt that there will be many unexpected edge cases in the future.
</i>

</details>

You **must** specify any boolean props with a literal `boolean` annotation, just like what we'll talk about later in the [`vineProp` section](/design/macros#vineprop).

In a nutshell, if you don't provide a formal parameter for the VCF, and no `vineProp` macro call inside the VCF as well, component's `props` field will be `{}`.

## Caveats

### Restricted TypeScript use case

Although we use TypeScript, we still have some restrictions inside `.vine.ts` files:

- All macros are only allowed to be called inside VCF.

- In top-leve scope:

  - Expression statement are not allowed, because it may cause side effects.
  - Any Vue reactivity API call is not allowed in declarations.

  For example, the following code is not allowed:

  ```vue-vine
  // Bare expression statement
  1 + some_func();
  new SomeClass()

  // With Vue reactivity API call
  const foo = ref(0)
  const bar = computed(() => foo.value + 1)

  // It's not allowed to call any function
  // that contains reactivity API call as well.
  // But compiler can't detect it,
  // so it's your responsibility to avoid it.
  const baz = some_func_contains_reactivity_api_call()
  ```

  Correspondingly, the following code is allowed:

  ```vue-vine
  // Simple contants
  const WIDTH = 100

  // Call a function that has no side effects.
  // But compiler can't detect it,
  // so it's your responsibility to guarantee it.
  const result = func_with_no_side_effects()

  // Define a function that contains reactivity API call is allowed,
  // because this is just how we build "Vue Composable".
  const valid_fn = () => {
    const count = ref(0)
    const inc = () => count.value += 1
    const dec = () => count.value -= 1
    return { count, inc, dec }
  }
  ```
