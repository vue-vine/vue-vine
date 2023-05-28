# Get started

Welcome to join us to exploring another style of writing Vue! 

Vine provides a Vite plugin and a VSCode extension to offer feature support.

## Install Vite plugin
  
```bash
pnpm i -D vue-vine
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