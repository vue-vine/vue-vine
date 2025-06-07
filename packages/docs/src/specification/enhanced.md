# Enhanced Features

Vine provides some enhanced features, which are some useful syntax sugars.

## Transform boolean props

Since v1.3.0, Vine provides special transformation for boolean props, which is credit to [Vue Macros](https://vue-macros.dev/features/boolean-prop.html) by MIT License.

Convert `<Comp checked />` to `<Comp :checked="true" />`.

Convert `<Comp !checked />` to `<Comp :checked="false" />`.
