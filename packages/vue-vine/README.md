# Vue Vine

Another style to write Vue.js.

## Install

```bash
# If you didn't install `@antfu/ni` yet, I highly recommend you to install it.
ni -D vue-vine
```

Use the plugin in `vite.config.ts`:

```ts
import { VineVitePlugin } from 'vue-vine/vite'

export default defineConfig({
  plugins: [
    // ...Other plugins
    VineVitePlugin()
  ],
})
```
