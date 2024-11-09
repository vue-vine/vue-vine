# format-vine-component-name

Enforce Vue Vine component function name format to be PascalCase.

## Rule Details

<!-- eslint-skip -->
```js
// 👎 bad
function pageHeader() {
  // ...
  return vine`...`
}
```

<!-- eslint-skip -->
```js
// 👍 good
function PageHeader() {
  // ...
  return vine`...`
}
```
