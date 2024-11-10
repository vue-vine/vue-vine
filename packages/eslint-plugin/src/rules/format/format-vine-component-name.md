# format-vine-component-name ![](https://img.shields.io/badge/vue_vine-format-emerald)

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
