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

接着，请将以下配置添加到你的 `eslint.config.js` 文件中：

```js
import antfu from '@antfu/eslint-config'

// `VueVine()` 返回一个 ESLint flat config
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

## Slidev 插件 {#slidev-plugin}

自 v1.4.0 起，Vine 还提供了一个 Slidev 的插件，你可以使用它来注册 Vine 组件到你的 Slidev 项目中。

要安装这个插件，你需要在 Slidev 项目中添加一个 `setup/main.ts` 文件来设置 Vue 应用，更多细节请参考 [Slidev 文档](https://sli.dev/custom/config-vue)。

```ts
import { defineAppSetup } from '@slidev/types'
import { VueVineSlidevPlugin } from 'vue-vine/slidev'

export default defineAppSetup(({ app }) => {
  app.use(
    VueVineSlidevPlugin(
      // 确保这个 glob 路径是相对于这个 `setup/main.ts` 文件的
      import.meta.glob('./components/*.vine.ts', { eager: true })
    )
  )
})
```

## 常见问题 {#common-questions}

### 使用 UnoCSS Attribute Mode {#conflict-with-unocss-attribute-mode}

因为 Vue Vine 的模板类型检查开启了 Vue language tools 的严格模式，所以本身是不允许随便在模板的 HTML 标签上使用任意名称的属性的，而这会影响到使用 UnoCSS Attribute Mode 的场景。为了解决此类问题，请你在项目 `tsconfig.json` 所包含（`include`）的范围内，添加一个 `shims.d.ts` 文件，并写入以下内容：

```ts
declare module 'vue' {
  interface HTMLAttributes {
    [key: string]: any
  }
}

export {}
```
