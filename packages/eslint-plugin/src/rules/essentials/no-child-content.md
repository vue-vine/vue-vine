# no-child-content ![](https://img.shields.io/badge/vue_vine-essentials-blue)

Disallow element's child contents which would be overwritten by a directive like `v-html` or `v-text`

## Rule Details

This rule reports child content of elements that have a directive which overwrites that child content. By default, those are `v-html` and `v-text`, additional ones can be configured manually.

<!-- eslint-skip -->
```html
<template>
  <!-- ✓ GOOD -->
  <div>child content</div>
  <div v-html="replacesChildContent"></div>

  <!-- ✗ BAD -->
  <div v-html="replacesChildContent">child content</div>
</template>
```

## Options

```jsonc
{
  "vue-vine/essentials-no-child-content": ["error", {
    // 'v-html' and 'v-text' are no need for manually configured,
    // they will be load by default, so only put additional directive names here.
    "directives": ["foo"]
  }]
}
```
