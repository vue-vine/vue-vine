# Caveats

Although `.vine.ts` is a valid TypeScript file, there're still some caveats you should follow.

### Restricted TypeScript use case

- All macros are only allowed to be called inside VCF.

- In top-level scope:

  - Expression statement are not allowed, because it may cause side effects.
  - Any Vue reactivity API call is not allowed in top-level declarations.

For all the following examples, we assume they're all in top-level scope.

These are incorrect usages:

```vue-vine
// Bare expression statement
1 + some_func();
new SomeClass()

// With Vue reactivity API call
const foo = ref(0)
const bar = computed(() => foo.value + 1)
```

As you can see, It's not allowed to call any function that contains reactivity API call as well.

But compiler can't detect it, so it's your responsibility to avoid it.

Correspondingly, the following code is allowed:

```vue-vine
// Simple contants
const WIDTH = 100

// Call a function that has no side effects is allowed.
// But compiler can't detect it,
// so it's your responsibility to guarantee it.
const result = func_with_no_side_effects()

// Define a function that contains reactivity API call is allowed,
// because that is just how we build a "Vue Composable".
const valid_vue_composable = () => {
  const count = ref(0)
  const inc = () => count.value += 1
  const dec = () => count.value -= 1
  return { count, inc, dec }
}
```
