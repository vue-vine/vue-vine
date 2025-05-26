# Enhanced Features

Vine provides some enhanced features, which are some useful syntax sugars.

## Transform boolean props <VersionTip version="v1.3.0+" />

Credit to [Vue Macros](https://vue-macros.dev/features/boolean-prop.html) by MIT License.

Convert `<Comp checked />` to `<Comp :checked="true" />`.

Convert `<Comp !checked />` to `<Comp :checked="false" />`.

**Default:** Not enabled

**Usage:**

```ts
// vite.config.ts
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    VineVitePlugin({
      vueCompilerOptions: {
        transformBooleanProp: true,
      },
    }),
  ],
})
```
