# no-lifecycle-hook-after-await ![](https://img.shields.io/badge/vue_vine-essentials-blue)

This rule reports the lifecycle hooks after await expression.

In Vue component's setup phase, `onXXX` lifecycle hooks should be registered synchronously.

<!-- eslint-skip -->
```ts
// BAD
async function VineComp() {
  await doSomethingAsync()

  onMounted(() => {
    // ...
  })
}
```

<!-- eslint-skip -->
```ts
// GOOD
async function VineComp() {
  onMounted(() => {
    // ...
  })

  await doSomethingAsync()
}
```
