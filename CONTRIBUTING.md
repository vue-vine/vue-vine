# Vue Vine Contributing Guide

Hello!, We are very excited that you are interested in contributing with Vue Vine. However, before submitting your contribution, be sure to take a moment and read the following guidelines.

### Tooling

- [PNPM](https://pnpm.io/) to manage packages and dependencies
- [tsdown](https://tsdown.dev/) to bundle packages
- [Changeset](https://github.com/atlassian/changesets) for changes
  documentation, changelog generation, and release management.

### Commit Convention

Before you create a Pull Request, please check whether your commits comply with
the commit conventions used in this repository.

When you create a commit we kindly ask you to follow the convention
`category(scope or module): message` in your commit message while using one of
the following categories:

- `feat`: all changes that introduce completely new code or new
  features
- `fix`: changes that fix a bug (ideally you will additionally reference an
  issue if present)
- `refactor`: any code related change that is not a fix nor a feature
- `docs`: changing existing or creating new documentation (i.e. README, docs for
  usage of a lib or cli usage)
- `build`: all changes regarding the build of the software, changes to
  dependencies or the addition of new dependencies
- `test`: all changes regarding tests (adding new tests or changing existing
  ones)
- `ci`: all changes regarding the configuration of continuous integration (i.e.
  github actions, ci system)
- `chore`: all changes to the repository that do not fit into any of the above
  categories

  e.g. `feat(vite-plugin): add some utils function`

If you are interested in the detailed specification you can visit
https://www.conventionalcommits.org/ or check out the
[Angular Commit Message Guidelines](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines).

## Pull Request Guidelines

- The `main` branch is our latest code branch. Make sure your branch is merged into the main branch.
- Make sure that Github Actions are green.
- It is good to have multiple small commits while working on the PR. We'll let GitHub squash it automatically before the merge.
- If you add a new feature:
  - Add the test case that accompanies it.
  - Provide a compelling reason to add this feature. Ideally, We would first open a suggestion topic and green it before working on it.
- If you correct an error:
  - If you are solving a special problem, Please add the issue in your PR.
  - Provide a detailed description of the error in the PR. Favorite live demo.
  - Add the appropriate test coverage, if applicable.

### Steps to PR

1. Fork of the Vue Vine repository and clone your fork.

2. Create a new branch out of the `main` branch. We follow the convention
   `[type/scope]`. For example `fix/compiler-hook` or `docs/props-typo`. `type`
   can be either `docs`, `fix`, `feat`, `build`, or any other conventional
   commit type. `scope` is just a short id that describes the scope of work.

3. Make and commit your changes following the
   [commit convention](https://github.com/vue-vine/vue-vine/blob/main/CONTRIBUTING.md#commit-convention).

4. You can refer to [Adding a changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md) to create a detailed description of your changes. This
   will be used to generate a changelog when we publish an update.
   [Learn more about Changeset](https://github.com/atlassian/changesets/tree/master/packages/cli).

## Development Setup

After cloning the repository, execute the following commands in the root folder:

1. Install dependencies

```bash
pnpm install
```

We use [Pnpm monorepo](https://pnpm.io/workspaces) for the project management.

2. Build all the required packages

```bash
pnpm run build
```

3. Build the VSCode extension

```bash
pnpm run build:ext
```

4. Start the Playground's dev server

```bash
pnpm run play
```

> You can see the demo in `http://localhost:3333/`.
>
> You can inspect the transforming process in `http://localhost:3333/__inspect/`

5. After building the VSCode extension, you can open the 'Debug' tab in VSCode, and start the **'Run Vine Extension'** debug session.

    <img width="385" alt="image" src="https://github.com/vue-vine/vue-vine/assets/46062972/374b77a4-9d49-4eb6-a84b-f7ab64b99bdf">

6. Create a branch for your feature or fix:

```bash
# Move into a new branch for your feature
git checkout -b feat/thing
```

```bash
# Move into a new branch for your fix
git checkout -b fix/something
```

7. If your code passes all the tests, then push your feature/fix branch:

All commits that fix bugs or add features need a test.
You can run the next command for component specific tests.

```bash
pnpm run test
```

8. Be sure the package builds.

```bash
pnpm run build

pnpm run build:ext
```

> Note: ensure your version of Node is 18 or higher to run scripts

9. Send your pull request:

- Send your pull request to the `main` branch
- Your pull request will be reviewed by the maintainers and the maintainers will decide if it is accepted or not
- Once the pull request is accepted, the maintainers will merge it to the `main` branch

## Documentation

Please update the docs with any API changes, the code and docs should always be in sync.

The main documentation lives in the `packages/docs` folder, the project uses `vitepress`.
