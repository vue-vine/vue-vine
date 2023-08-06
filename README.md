# Vue Vine

[中文 README](./README-CN.md)

Another style of writing Vue components.

## Why this ?

There are many discussions in community that hopes for a solution that supports writing multiple Vue components in a single file. That's why `Vue Vine` was born.

`Vue Vine` was designed to provide more flexibility of managing Vue components. It is a parallel style to SFC.

Take a quick view:

![Quick view](./packages/docs/public/highlight-demo.png)

## Try the demo

**warning:** For now, `Vue Vine` is still under heavily development, please don't use it in production.

You can try the demo by following steps:

For development environment setup, first you need to get the VSCode extension bundle ouput.

```bash
git clone https://github.com/vue-vine/vue-vine.git
cd vue-vine
pnpm install

# Start watching the VSCode extension's building
pnpm run ext:dev
```

and then start the Playground's dev server.

```bash
pnpm run play
```

1. You can see the demo in `http://localhost:3333/`.
2. You can inspect the transforming process in `http://localhost:3333/__inspect/`
