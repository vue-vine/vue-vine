---
outline: deep
---

# Specification

We'll talk about all the basic concepts of Vue Vine in this chapter.

## File extension and semantics

Vine uses `.vine.ts` as the file extension, so you know that you're actually writing TypeScript, any valid grammar in TypeScript is also valid for Vine.

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

> You may wonder where this `vine` tag function is imported from, it's actually just declared a function signature and no implementation, written in a type definition file (`macros.d.ts`) on the global environment, making it available at compile time.

Vine compiler will transform this kind of function into a Vue component object in underhood.

In addition, the tagged template string expression doesn't have any meaning in runtime.

It's indeed a valid function in TypeScript syntax and context, <b class="text-rose-400">but calling it will not make any sense, in order to avoid undefined behavior, please don't do that.</b>

### template

**Using expression interpolation in template is forbidden.**

Because the whole tagged template string is just a raw Vue template. Vine compiler will transfer it to `@vue/compiler-dom` to compile it to render function in the end.

```vue-vine
function ValidComponent() {
  const count = ref(0)

  return vine`
    <div>
      <button @click="count++">Increment</button>
      <div>Count: {{ count }}</div>
    </div>
  `
}

function InvalidComponent() {
  const name = 'World'

  return vine`<div>Hello ${name}</div>` // This will report an error
}
```

To be noted, in Vue's template, there might be JS expressions inside v-bind or between <code v-text="'{{'" /> and <code v-text="'}}'" /> , so there might be template strings with interpolation expressions, but in Vine, this is not allowed.

```ts
function MyComponent() {
  const userName = ref('Vine')

  // As you can see below in our documentation site,
  // IDE can't highlight the template part correctly like this.
  return vine`
    <a :href="/user/\`\${userName}\`">
      Profile
    </a>
  `
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

1. Define props on a VCF parameter, it should be the first one, and write a TypeScript Object literal type annotation for it, with all the props you want to define.

2. Use `vineProp` macro to define prop one by one, but the advantage of this way is that you can easily use every single prop's value as a `Ref`, instead of wrapping `props` with`toRefs` manually.

We provide a dedicated chapter for props, you can [check it](./props.html) for more details.

## Macros

With Vue 3.2 was released, we have a few powerful macros in `<script setup>` block, and [Vue Macros](https://vue-macros.sxzz.moe/) shows how fantastic this idea is, and then in v3.3, Vue added more built-in macros.

In Vine, we just provide a small amount of macros for now, you can check more details in our dedicated [Macros](./macros.html) chapter. We keep the possibility to add more macros in the future, but every step we take will be cautious.
