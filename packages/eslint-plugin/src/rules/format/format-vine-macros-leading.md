# format-vine-macros-leading

Enforce Vine macros call to be leading in component function.

## Rule Details

<!-- eslint-skip -->
```js
// 👎 bad
function Component() {
  const count = ref(1)
  const double = computed(() => count.value * 2)
  const foo = vineProp<string>()

  const emits = vineEmits<{
    tap: [x: number, y: number]
  }>()

  return vine`...`
}
```

<!-- eslint-skip -->
```js
// 👍 good
function Component() {
  const foo = vineProp<string>()
  const emits = vineEmits<{
    tap: [x: number, y: number]
  }>()

  const count = ref(1)
  const double = computed(() => count.value * 2)

  return vine`...`
}
```

These Vine macros should be placed at the beginning of the component function.

- `vineProp`
- `vineProp.withDefault`
- `vineProp.optional`
- `vineEmits`
- `vineSlots`
- `vineOptions`
