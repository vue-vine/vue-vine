---
outline: deep
---

# Specification

We'll talk about all the basic concepts of Vue Vine in this chapter.

::: warning 🚨 WARNING

<b>Before starting to use it, you're supposed to know the following conventions:</b>

- Vine was designed to only support Vue 3.0+ and Vite.
- Vine is only designed to support TypeScript, JavaScript-only users may not enjoy the full functionality

:::

## File extension and semantics

Vine uses `.vine.ts` as the file extension, so you know that you're actually writing TypeScript, any valid grammar in TypeScript is also valid for Vine.

But we do restrict some scenarios in TypeScript to form an analyzable context for Vine compiler, which you must know and follow. You can check the [Caveats](./specification/caveats.html) chapter for more details.

## Vine component function

Vine component function (We'll call it **"VCF"** in the rest of our documentation) is a function that returns a template string tagged by `vine`, which declares the component's template.

This means that any function that explicitly uses `vine` tagged template string on its return value is recognized by the compiler as a Vue Vine component.

```vue-vine
function MyComponent() {
  return vine`<div>Hello World</div>`
}

// This is also valid
const AnotherComponent = () => vine`<div>Hello World</div>`
```

Vine compiler will transform this kind of function into a Vue component object in underhood.

In addition, the tagged template string expression will just return an `undefined`, without any effect in runtime.

It's indeed a valid function in TypeScript syntax and context, <b class="text-rose-400">but calling it will not make any sense, in order to avoid undefined behavior, please don't do that.</b>

### template

**Using expression interpolation in template is forbidden.**

Because the whole tagged template string is a raw Vue template. Vine compiler will transfer it to `@vue/compiler-dom` to compile it to render function in the end.

```vue-vine
function MyComponent() {
  const name = 'World'

  return vine`<div>Hello ${name}</div>` // This will report an error
}
```

### setup

::: info 💡 TIPS

We assume that you've already known about Vue 3's `<script setup>`, if you don't, please check the [Vue documentation](https://vuejs.org/guide/composition-api-introduction.html#script-setup).

:::

You can treat the VCF as a Vue SFC's `<script setup>`, the function body is where you can define the component's logic.

Here's an example, the highlighted part will transpiled into Vue's `setup` function, just like what `<script setup>` does in Vue SFC:

```vue-vine {2-5}
function MyComponent() {
  const num = ref(0)
  const randomPick = () => {
    num.value = Math.floor(Math.random() * 10)
  }

  return vine`
    <div :data-test-id="testId">
      <button @click="randomPick">Pick</button>
      <div>{{ num }}</div>
    </div>
  `
}
```

### props

To define props for component, there're two ways for you:

1. Give your VCF a `props` formal parameter as the first one, and write a TypeScript Object literal type annotation for it, with all the props you want to define.

2. Use `vineProp` macro to define prop one by one, but the advantage of this way is that you can easily use every single prop's value as a `Ref`, instead of wrapping `props` with`toRefs` manually.

We provide a dedicated chapter for props, you can [check it](./props.html) for more details.

## Macros

With Vue 3.2 was released, we have a few powerful macros in `<script setup>` block, and [Vue Macros](https://vue-macros.sxzz.moe/) shows how fantastic this idea is, and then in v3.3, Vue added more built-in macros.

In Vine, we just provide a small amount of macros for now, you can check more details in our dedicated [Macros](./macros.html) chapter. We keep the possibility to add more macros in the future, but every step we take will be cautious.
