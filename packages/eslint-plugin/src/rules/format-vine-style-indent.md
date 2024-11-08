# format-vine-style-indent

Enforce prettier indentation for template string inside vineStyle.

## Rule Details

<!-- eslint-skip -->
```js
// 👎 bad
function Component() {

  vineStyle(css`
.container {
  display: flex;
  align-items: center;
}
  `)

  return vine`...`
}
```

<!-- eslint-skip -->
```js
// 👍 good
function Component() {

  vineStyle(css`
    .container {
      display: flex;
      align-items: center;
    }
  `)

  return vine`...`
}
```

By default it affects the template tag named:

- `css`
- `postcss`
- `scss`
- `sass`
- `less`
- `stylus`
