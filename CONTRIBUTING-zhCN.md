**Vue Vine 贡献指南**

### 工具链

- 使用 [PNPM](https://pnpm.io/) 管理包和依赖
- 使用 [Tsup](https://tsup.egoist.sh/) 最终打包
- 使用 [Changeset](https://github.com/atlassian/changesets) 进行更改记录、changelog 生成和发布管理

### 提交规范

在提交 Pull Request 之前，请检查你的 commit 是否符合本仓库的提交规范。

当你创建一个 commit 时，我们要求你遵循以下规范：

- `feat`: 所有引入新代码或新功能的修改
- `fix`: 修复bug，理想情况下，你会额外引用一个 issue 的号码，例如 `#123`
- `refactor`: 不是修复也不是新功能的任何代码相关改变
- `docs`: 修改现有的文档或创建新的文档（例如 README、对某个库或 CLI 的使用文档）
- `build`: 所有与软件构建有关的修改，包括更改依赖项或添加新依赖
- `test`: 所有与测试相关的修改（添加新测试或改变现有的测试）
- `ci`: 所有与持续集成配置相关的修改（例如 GitHub Actions、CI 系统）
- `chore`: 不符合上述任何类别的仓库更改

例如：`feat(vite-plugin): add some utils function`

如果你感兴趣了解详细规范，可以访问 [https://www.conventionalcommits.org/](https://www.conventionalcommits.org/) 或查看 [Angular 提交信息规范指南](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines)。

## Pull Request 指南

- 确保你的分支与 `main` 分支合并
- 确保 GitHub Actions 绿色通过
- 如果你在 PR 中添加了新功能，请确保有相应的测试案例，并提供一个让这个功能值得被添加的理由。理想情况下，我们会先开启一个提议主题并绿色它，然后才开始工作。
- 如果你修复了bug：
  - 如果你解决的是一个特殊问题，请在 PR 中添加该 issue
  - 提供一个详细的 bug 描述，并且最好附带一个 live demo
  - 添加合适的测试覆盖

## 开发环境设置

克隆仓库后，在根目录执行以下命令：

1. 安装依赖项

```bash
pnpm install
```

我们使用 [PNPM monorepo](https://pnpm.io/workspaces) 进行项目管理。

2. 构建所需的包

```bash
pnpm run build
```

3. 构建 VSCode 扩展

```bash
pnpm run build:ext
```

4. 启动 Playground 的开发服务器

```bash
pnpm run play
```

> 你可以在 `http://localhost:3333/` 查看 demo。
>
> 你可以在 `http://localhost:3333/__inspect/` 查看变换过程。

5. 构建 VSCode 扩展后，在 VSCode 中打开“Debug”标签，启动 “Run Vine Extension” debug 会话。

    <img width="385" alt="image" src="https://github.com/vue-vine/vue-vine/assets/46062972/374b77a4-9d49-4eb6-a84b-f7ab64b99bdf">

6. 为你的功能或修复创建一个分支：

```bash
# 创建一个新分支为你的功能
git checkout -b feat/thing

# 创建一个新分支为你的修复
git checkout -b fix/something
```

7. 如果你在 PR 中的代码通过所有测试，推送你的分支：

```bash
pnpm run test
```

8. 确保包可以构建：

```bash
pnpm run build

pnpm run build:ext
```

> 注意：确保 Node 版本为 18 或更高，以运行脚本。

9. 发送 PR：

- 将你的 PR 发送到 `main` 分支。
- 仓库维护者会对你的 PR 进行审查，决定是否接受或拒绝。
