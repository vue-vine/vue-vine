# Vue Vine

[English README](./README.md)

创造另一种书写 Vue 组件的方式。

## 背景

在社区中，有很多帖子讨论过希望有一个支持在单个文件中编写多个 Vue 组件的解决方案。`Vue Vine` 因此而生。

要了解更多细节，请查看我们的[文档](https://vue-vine.netlify.app/)。 [![Netlify Status](https://api.netlify.com/api/v1/badges/ff99c4c5-2766-4716-81db-599ce4346647/deploy-status)](https://app.netlify.com/sites/vue-vine/deploys)

`Vue Vine` 旨在提供更多管理 Vue 组件的灵活性，它并不是要取代 Vue SFC，而是作为一种并行的解决方案。

下面是一个简单的示例预览：

![示例预览](./packages/docs/public/highlight-demo.png)

## 即刻尝鲜

**注意:** 目前，Vue Vine 仍处于密集开发阶段，请不要将其用于生产环境。

你可以按照下面的步骤操作，启动示例项目来预览：

首先，你需要获取 VSCode 插件的构建输出。

```bash
git clone https://github.com/vue-vine/vue-vine.git
cd vue-vine
pnpm install

# 构建所有相关的包
pnpm run build

# 开启 VSCode 插件的构建监听
pnpm run ext:dev
```

然后，开启 Playground 的 Vite 开发服务器。

```bash
pnpm run play
```

1. 接下来可以在 `http://localhost:3333/` 中看到示例。
2. 你可以在 `http://localhost:3333/__inspect/` 中查看源代码在 Vite 处理管道的转换过程。
