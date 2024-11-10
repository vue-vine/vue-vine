# no-dupe-attributes ![](https://img.shields.io/badge/vue_vine-essentials-blue)

disallow duplication of attributes

## Rule Details

When there are multiple attributes with the same name on a component, only the last one is used and the rest are ignored, so this is usually a mistake.

<!-- eslint-skip -->
```html
<template>
  <!-- ✓ GOOD -->
  <MyComponent :foo="abc" />
  <MyComponent foo="abc" />
  <MyComponent class="abc" :class="def" />

  <!-- ✗ BAD -->
  <MyComponent :foo="abc" foo="def" />
  <!--                    ~~~~~~~~~ -->
  <MyComponent foo="abc" :foo="def" />
  <!--                   ~~~~~~~~~~ -->
  <MyComponent foo="abc" foo="def" />
  <!--                   ~~~~~~~~~ -->
  <MyComponent :foo.a="abc" :foo.b="def" />
  <!--                      ~~~~~~~~~~~~ -->
  <MyComponent class="abc" class="def" />
  <!--                     ~~~~~~~~~~~ -->
</template>
```
