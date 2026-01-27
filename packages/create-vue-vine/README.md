# create-vue-vine <a href="https://npmjs.com/package/create-vue-vine"><img src="https://img.shields.io/npm/v/create-vue-vine" alt="npm package"></a> <img src="https://img.shields.io/badge/experimental-aa58ff" />

[中文文档](./README.zh-CN.md)

The official CLI for creating your Vue Vine projects.

> **Compatibility Note**: Vue Vine requires Node.js version 18+, 20+. However, some templates require a higher Node.js version to work, please upgrade if your package manager warns about it.

## Features

- 🛠️ **Build Tool Choice**: Choose between Vite (recommended) or Rsbuild
- 🎨 **CSS Frameworks**: Optional UnoCSS or Tailwind CSS integration
- 🚦 **Vue Router**: Optional routing support
- 📦 **Pinia**: Optional state management
- 📝 **TypeScript**: Full TypeScript support out of the box

With NPM:

```bash
$ npm create vue-vine@latest
```

With Yarn:

```bash
$ yarn create vue-vine
```

With PNPM:

```bash
$ pnpm create vue-vine
```

With Bun:

```bash
$ bun create vue-vine
```

Then follow the prompts!

You can also directly specify the project name and the template you want to use via additional command line options. For example, to scaffold a Vue Vine `vue-router` app, run:

```bash
# npm 7+, extra double-dash is needed:
npm create vue-vine@latest my-vue-vine-app -- --router

# yarn
yarn create vue-vine my-vue-vine-app --router

# pnpm
pnpm create vue-vine my-vue-vine-app --router

# Bun
bun create vue-vine my-vue-vine-app --router
```
