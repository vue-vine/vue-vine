# 周边生态 {#ecosystem}

除了 Vite 插件和 VSCode 扩展，Vine 还提供了一些你可能需要的其他库。

## 自定义 ESLint 配置 {#eslint-config}

因为我们为 `.vine.ts` 定义了一种新的语法，即将标记模板字符串作为 Vue 模板，我们需要一个自定义的 ESLint 解析器来使 ESLint 正常工作。如果你对内部实现感兴趣，可以查看[源代码](https://github.sheincorp.cn/vue-vine/vue-vine/tree/main/packages/eslint-parser)。简而言之，它将用 Vue 模板根节点替换标记模板字符串的 ESTree 节点。

我们已经为 Vue Vine 提供了一份特定的 ESLint 规则包，它应该可以与大多数现有的规则预设一起工作，比如 `@antfu/eslint-config`、`@sxzz/eslint-config` 等。

**但样式相关的规则尚未完全支持，我们会持续迭代并完善。**

要配置自定义解析器，请运行以下命令安装包：

```bash
pnpm i -D @vue-vine/eslint-config
```

接着，请将以下配置添加到你的 `eslint.config.mjs` 文件中：

```js
import antfu from '@antfu/eslint-config'

// `VueVine()` returns a ESLint flat config
import VueVine from '@vue-vine/eslint-config'

export default antfu(
  {
    // 第一个选项对象不是 ESLint 的 FlatConfig
    // 是 antfu 规则自身的配置
  },
  ...VueVine(),
)
```

## 命令行中的 TypeScript 检查器 {#typescript-checker-in-command-line}

我们知道 Vue 提供了 `vue-tsc` 来检查 `.vue` 文件的 TypeScript，为了支持 Vine，我们也提供了一个类似的命令 `vue-vine-tsc` 来检查 `.vine.ts` 文件。

**值得一提的是：** `vue-vine-tsc` 与 `vue-tsc` 兼容，所以你也可以用它来检查 `.vue` 文件。

要安装这个包，请运行以下命令：

```bash
pnpm i -D vue-vine-tsc
```

接着，在 `package.json` 的 `"build"` 脚本中，你可以将 `vue-tsc -b && ...` 替换为：

```diff
{
  "scripts": {
-    "build": "vue-tsc -b && vite build",
+    "build": "vue-vine-tsc -b && vite build",
  }
}
```

## 项目模板 {#project-starter-template}

你可以渐进式地将 Vue Vine 集成到现有的 Vue 3 项目中，但如果你想要启动一个新项目，放弃 SFC，只使用 Vue Vine，我们也为你提供了一个创建项目模板的脚手架工具。

**可选：** 运行以下命令全局安装 CLI：

```bash
pnpm i -g create-vue-vine
```

接着，运行以下命令来创建一个新项目：

```bash
# 你没有全局安装 CLI 的话
pnpx create-vue-vine my-vine-project

# 你已经全局安装 CLI 的话
create-vue-vine my-vine-project
```

你可能会看到以下输出：

```text
> pnpx create-vue-vine my-vine-project

...

┌  Vue Vine - Another style of writing Vue components
│
◇  Use Vue Router?
│  Yes
│
◇  Project created at: /path/to/my-vine-project
│
◇  Install dependencies?
│  Yes
│

...

◇  Dependencies installed!
│
└  You're all set! Now run:

  cd my-vine-project
  pnpm dev

  Happy hacking!
```
