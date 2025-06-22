# format-prefer-template ![](https://img.shields.io/badge/vue_vine-format-emerald)

This rule is a fork of ESLint built-in rule [prefer-template](https://eslint.org/docs/latest/rules/prefer-template#resources).

In case of forbidding to nest template string inside Vue Vine template inner JS expression, so the original autofix may break Vine template, so we make a Vine specific version of this rule.

## Options

```ts
type Options = [{
  allowInTemplate?: boolean
}]
```

- `allowInTemplate`: Whether to allow string concatenation in Vue Vine template.

## Rule Details

<!-- eslint-skip -->
```js
// 👎 bad
function Component() {
  let a = 'foo' + bar;
  //      ^^^^^^^^^^^
  // Unexpected string concatenation. Please use template literals.

  return vine`
    <div
      :class="[
        'btn',
        'btn-' + type,
    //  ^^^^^^^^^^^^^^^^
    //  Not recommend string concatenation in vine template.
    //  Please extract it to a variable or computed.
      ]"
    >
      ... ...
    </div>
  `
}
```

<!-- eslint-skip -->
```js
// 👍 good
function Component() {
  let a = `foo${bar}`;
  let btnType = `btn-${type}`;

  return vine`
    <div :class="['btn', btnType]">
      ... ...
    </div>
  `
}
```
