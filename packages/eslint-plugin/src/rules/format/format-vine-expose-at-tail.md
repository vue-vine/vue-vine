# format-vine-expose-at-tail ![format](https://img.shields.io/badge/vue_vine-format-emerald)

Enforce `vineExpose` to be at the tail of the component function body.

## Rule Details

<!-- eslint-skip -->
```js
// 👎 bad
function Component() {
  const count = ref(1)
  const double = computed(() => count.value * 2)

  vineExpose({
    count,
    double,
  })
  watchEffect(() => {
    console.log(double.value)
  })

  return vine`...`
}
```

<!-- eslint-skip -->
```js
// 👍 good
function Component() {
  const count = ref(1)
  const double = computed(() => count.value * 2)
  watchEffect(() => {
    console.log(double.value)
  })

  vineExpose({
    count,
    double,
  })

  return vine`...`
}
```

`vineExpose` is a macro that is used to expose the component's properties to the outside, which means it's supposed to be at the tail of the component function body, after everything was already defined.
