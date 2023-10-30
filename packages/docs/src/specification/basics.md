---
outline: deep
---

# Specification

We'll talk about all the basic concepts of Vue Vine in this chapter.

Before starting to use it, you're supposed to know the following conventions:

- Vine was designed to only support Vue 3 and Vite.
- Vine only supports TypeScript, JavaScript users may not have full experience.
- Vine is designed for ESM only; 'require' is not supported.

## File extension

Vine uses `.vine.ts` as the file extension, so you know that you're actually writing TypeScript, any valid grammar in TypeScript is also valid for Vine.

## Vine component function

Vine component function is a function that returns a template string tagged by `vine`, which declares the component's template.

```vue-vine
function MyComponent() {
  return vine`<div>Hello World</div>`
}
```

We'll call it **"VCF"** in the rest of our documentation.

Vine compiler will transform this kind of function into a Vue component object in underhood.

In addition, the tagged template string expression will not return anything.

It's indeed a valid function in TypeScript context, **but calling it will not make any sense, so don't do that.**

### template

Using expression interpolation in template is forbidden, because the whole tagged template string is a raw Vue template. Vine compiler will transfer it to `@vue/compiler-dom` to compile it to render function in the end.

```vue-vine
function MyComponent() {
  const name = 'World'

  return vine`<div>Hello ${name}</div>` // This will report an error
}
```

### setup

You can treat the VCF as a Vue component's `setup` function, the function body is for you to define your component's logic.

Here's an example:

```vue-vine
function MyComponent(props: {
  testId: string
}) {
  const num = ref(0)
  const randomPick = () => {
    num.value = Math.floor(Math.random() * 10)
  }

  return vine`
    <div :data-test-id="testId">
      <button>Pick</button>
      <div>{{ num }}</div>
    </div>
  `
}
```

## Macros

With Vue 3.2 was released, we can use macros in `<script setup>` block, and [Vue Macros](https://vue-macros.sxzz.moe/) pushed the idea to the extreme, in Vue 3.3, Vue added more built-in macros.

In Vine, we just provide a small amount of macros for now, you can check more details in our separated [Macros](./macros.html) chapter. We keep the possibility to add more macros in the future, but every step we take will be cautious.
