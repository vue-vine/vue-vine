# Enhanced Features

Vine provides some enhanced features, which are some useful syntax sugars.

## Transform boolean props

Vue's Boolean Casting mechanism has some bugs in the official implementation, please see [this example](https://play.vuejs.org/#eNp9UsFOwzAM/RUrFzYJtUJwmsokQBzgAIhx7CXt3BFokyhJx6bSf8fOWBlj7Fa/9/z6YrsTV9YmyxbFRGS+dMoG8BhaO821aqxxAW5MY6FypoGTJOWC5Se5ztKNnpRUBGxsLQNSBZC9nk1niIArSSh6KLA2HlKcKSjpZQSiqKAsiwhJTxLdzzEqQi+NLpSi+TNG03xOm7NRUm9qkb3aIMy2udiApFhTtb0m/uIBdfi6RYvX7F8P4C/+RVjuXhy6NEtMRcDF6RbYNjQt7MHXNH3QDZm3takPkI+ozd1yxk3sutWzyn2ji6mvYtDVnrx4m9XAbXfPoqDsrKP+lzQ0Hls/z39J+55chH7ct3TFLcL298v1FIvLqmPbGjec6yUxidnrM864H5azwQKY2qUtF/gVQ01fIIPjkIzQfubfJeEDx39dDQ+fiRztZzyEVxC18H97PEh2bioaj0ifAx9DyOiwtqiqeK99P04S7lvMOALOmRA+L4BS/8a8PkdMiB834ClOwa/D7b/ArqgGmM=).

Vine provides special transformation for boolean props, which is credit to [Vue Macros](https://vue-macros.dev/features/boolean-prop.html) by MIT License.

Convert `<Comp checked />` to `<Comp :checked="true" />`.

Convert `<Comp !checked />` to `<Comp :checked="false" />`.

But this feature conflicts with UnoCSS's attribute mode, because when the above rules are applied, `<div h-12px />` will be `<div h-12px="true" />` on the corresponding DOM node, which will cause the UnoCSS generated CSS code to fail to take effect on that node.

If you want to keep UnoCSS's attribute mode feature, please configure the Vite plugin explicitly to disable this feature:

```ts
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    VineVitePlugin({
      vueCompilerOptions: {
        __enableTransformBareAttrAsBool: false,
      },
    }),
  ],
})
```
