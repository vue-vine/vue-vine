# create-vue-vine <a href="https://npmjs.com/package/create-vue-vine"><img src="https://img.shields.io/npm/v/create-vue-vine" alt="npm package"></a> <img src="https://img.shields.io/badge/experimental-aa58ff" />

[English](./README.md)

用于创建 Vue Vine 项目的官方 CLI。

> **兼容性说明**：Vue Vine 开发服务器基于 `vite`，需要 Node.js 18+ 或 20+ 版本。某些模板可能需要更高的 Node.js 版本，如果包管理器有警告请升级。

使用 NPM：

```bash
$ npm create vue-vine@latest
```

使用 Yarn：

```bash
$ yarn create vue-vine
```

使用 PNPM：

```bash
$ pnpm create vue-vine
```

使用 Bun：

```bash
$ bun create vue-vine
```

然后按照提示操作！

你也可以通过命令行选项直接指定项目名称和要使用的模板。例如，创建一个带有 `vue-router` 的 Vue Vine 应用：

```bash
# npm 7+，需要额外的双破折号：
npm create vue-vine@latest my-vue-vine-app -- --router

# yarn
yarn create vue-vine my-vue-vine-app --router

# pnpm
pnpm create vue-vine my-vue-vine-app --router

# Bun
bun create vue-vine my-vue-vine-app --router
```
