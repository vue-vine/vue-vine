# no-v-for-key-on-child ![](https://img.shields.io/badge/vue_vine-essentials-blue)

This rule reports the key of the <template v-for> placed on the child elements.

In Vue.js 3.x, with the support for fragments, the <template v-for> key can be placed on the <template> tag.

<!-- eslint-skip -->
```vue
<!-- BAD -->
<template v-for="item in items">
  <Foo :key="item.id" />
</template>
```

```vue
<!-- GOOD -->
<template v-for="item in items" :key="item.id">
  <Foo />
</template>
```
