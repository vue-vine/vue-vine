# PR #359 dependency-major upgrade audit

Audit target: branch commit `bc827a87` (PR #359), compared with `origin/main` at `fd78ea93`. Sources below are first-party project docs, release notes, repositories, and package metadata only.

## Implementation update

The PR now follows Microsoft's documented side-by-side transition: `@typescript/native` aliases `typescript@7.0.2` and provides `tsc`, while the `typescript` package name aliases `@typescript/typescript6` for tools that still require the TypeScript 6 programmatic API. `@typescript/native-preview` has been removed. tsdown explicitly uses the TypeScript 7 native executable through `dts.generator: 'tsgo'` and `dts.tsgo.path`. Babel parser/types, Rspack, reactive-vscode, and the affected source code have also been migrated and verified.

## Executive findings

| Upgrade | Verdict | Required action |
|---|---|---|
| TypeScript 6 → 7.0.2 | **Requires side-by-side installation** | Use TS 7's `tsc` for CLI checks while keeping the official `@typescript/typescript6` compatibility package under the `typescript` name for Volar, Nuxt tooling, and typescript-eslint. |
| tsdown 0.22.14 + TS 7 | **Configuration-sensitive** | With TS 7 installed under the official side-by-side alias, configure `dts: { generator: 'tsgo', tsgo: { path } }` so declaration generation uses the native executable rather than relying on package-name auto-detection. |
| Babel parser 7 → 8 | **Source migration required** | Upgrade `@babel/types` to 8 in lockstep and migrate Babel 7 AST property reads (`typeParameters`, `parameters`) before enabling parser 8. |
| reactive-vscode 0.4 → 1 | **Source migration required** | Replace removed `defineConfigs`, `ConfigRef`, and `executeCommand`; config values are no longer refs. Review removed/changed composables. |
| Nuxt test-utils 4 + Vitest 4 | **PR combination is correct; comment is wrong** | Keep Vitest 4. `@nuxt/test-utils@4.0.3` is incompatible with Vitest 3. |
| Rsbuild 2 + plugin-sass 2 | **Migration completed** | Core/plugin-sass and direct `@rspack/core` are aligned on major 2; loader source-map typing was adapted and covered by Rsbuild E2E tests. |
| Pinia 4 | **Safe with packaging check** | App/template usage needs no API migration; ensure `@vue/devtools-api@^8.1.5` is installed and consumers are ESM-capable. |
| execa 10 | **Safe in current call sites, Node floor applies** | No API change needed for current `execa`/`execaSync` usage; require Node 22+. |
| lint-staged 17 | **Safe config, Node floor applies** | Existing string task config is unaffected; require Node >=22.22.1. |
| magic-string 1 | **Safe for this ESM repository** | No API migration found; CommonJS consumers would break because v1 is pure ESM. |
| ts-morph 28 | **Likely safe; test type-resolution paths** | Major is the embedded TypeScript 6 upgrade; current basic `Project`/`Node` APIs are unchanged in the release notes. |
| @antfu/eslint-config 9 | **Safe for current non-React config** | v9 breaking change is React-plugin-specific; this repository does not enable React. |
| vite-plugin-inspect 12 | **Safe only with Vite 8** | PR also upgrades Vite to 8, satisfying the v12 peer range. |
| jsdom 30 | **No code migration found; strict Node floor** | Tests require Node ^22.22.2, ^24.15.0, or >=26. Add/declare an engine floor if supporting older Node matters. |
| changelog-github 0.7 | **Safe and currently unused** | Only adds `disableThanks`; repository Changesets config uses `@changesets/cli/changelog`, not this package. |

## Detailed evidence

### 1. TypeScript 7.0.2, `typescript`/`tsc`, and `@typescript/native-preview`/`tsgo`

**Do not treat `typescript@7.0.2` as a drop-in replacement for TypeScript 6's JavaScript compiler API.** The native-port repository says the API is still “not ready,” while command-line checking and declaration emit are implemented. It also states that preview builds use `@typescript/native-preview` + `tsgo`, but “for TypeScript 7.0 RC and later, the command name is `tsc`.” ([native-port README at the 7.0.2 package source commit](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/README.md#L5-L16), [feature-status table](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/README.md#L18-L45))

Published package behavior confirms the distinction:

- [`typescript@7.0.2`](https://www.npmjs.com/package/typescript/v/7.0.2) exposes the `tsc` binary, platform-native dependencies, unstable API subpaths, and only a version module at the root.
- [`@typescript/native-preview`](https://www.npmjs.com/package/@typescript/native-preview/v/7.0.0-dev.20260707.2) exposes `tsgo`; its source package exports the same unstable API family and a root version module. ([package source](https://github.com/microsoft/typescript-go/blob/9977d6d38fcc78de8ae71770f3aa08256e6cc861/_packages/native-preview/package.json#L22-L84))

PR #359 currently installs **both**, and every package typecheck script still invokes `tsgo` (for example [`packages/compiler/package.json`](https://github.com/vue-vine/vue-vine/blob/bc827a87/packages/compiler/package.json#L32-L60)). That duplication should not remain if TS 7 is accepted: remove `@typescript/native-preview` and use `tsc --noEmit`.

However, the workspace includes tools that consume the classic `typescript` compiler API or declare it as a peer: Vue language tooling/Volar, `vue-tsc`, `@typescript-eslint`, and declaration tooling. Because the TS 7 root package is not the classic compiler API and upstream labels the new API unfinished, **the safe combination today is TypeScript 6 plus native-preview only where `tsgo` is intentionally tested**. A workspace-wide TS 7 switch should be blocked until those consumers explicitly support the native package API.

### 2. tsdown 0.22.14 declaration generation with TS 7/tsgo

`tsdown@0.22.14` allows TypeScript 5, 6, or 7 as an optional peer and requires Node `^22.18.0 || >=24.11.0` ([published package](https://www.npmjs.com/package/tsdown/v/0.22.14)). Its official docs require `typescript` for declaration generation and document `dts: true` / object configuration ([tsdown declaration docs](https://tsdown.dev/options/dts)).

The decisive behavior lives in its pinned `rolldown-plugin-dts@0.27.x`:

- the documented inference rule says TypeScript 7/native-preview selects `tsgo`, but the implementation actually auto-detects only `typescript` with `versionMajorMinor === '7.0'`; a preview package beside TypeScript 6 needs an explicit `tsgo`/`generator` option ([option docs](https://github.com/sxzz/rolldown-plugin-dts/blob/341b5e4740950c1eb80c85b47c05333ad2456193/src/options.ts#L25-L49), [detection code](https://github.com/sxzz/rolldown-plugin-dts/blob/341b5e4740950c1eb80c85b47c05333ad2456193/src/tsgo.ts#L11-L17));
- valid nested syntax is `dts: { tsgo: true }` or `dts: { generator: 'tsgo', tsgo: { path: '…' } }`; the `tsgo` option is experimental ([option source](https://github.com/sxzz/rolldown-plugin-dts/blob/341b5e4740950c1eb80c85b47c05333ad2456193/src/options.ts#L242-L266));
- with TypeScript 7 installed, binary resolution selects `typescript`, not `@typescript/native-preview` ([resolver source](https://github.com/sxzz/rolldown-plugin-dts/blob/341b5e4740950c1eb80c85b47c05333ad2456193/src/tsgo.ts#L30-L48));
- tsgo requires an explicit tsconfig, lacks custom-language support, and does not support all dts options ([normalization source](https://github.com/sxzz/rolldown-plugin-dts/blob/341b5e4740950c1eb80c85b47c05333ad2456193/src/options.ts#L399-L430)).

Vue Vine's root config already has `dts: true` and an explicit `tsconfig` ([`tsdown.config.ts`](https://github.com/vue-vine/vue-vine/blob/bc827a87/tsdown.config.ts#L70-L77)), so **TypeScript 7 automatically switches declaration generation to tsgo and needs no explicit `dts.tsgo` setting**. Under the safer TypeScript 6 + native-preview strategy, declaration generation remains on `tsc` unless configured as `dts: { tsgo: true }` or `dts: { generator: 'tsgo' }`. Also test declaration output because upstream still labels tsgo generation experimental and unavailable for custom languages.

### 3. Babel parser 8 AST changes

This upgrade is not safe as a version-only change.

Babel 8 is ESM-only and requires Node `^22.18.0 || >=24.11.0`; `@babel/parser@8.0.4` depends on `@babel/types@^8.0.4` ([Babel 8 announcement](https://babeljs.io/blog/2026/06/16/8.0.0), [`@babel/parser@8.0.4`](https://www.npmjs.com/package/@babel/parser/v/8.0.4)). PR #359 upgrades parser but leaves the repository's direct `@babel/types` catalog on 7.29.7, creating mixed AST types/helpers.

Repository-breaking AST changes include:

- `CallExpression.typeParameters` → `typeArguments`;
- `TSFunctionType.parameters` → `params` and `typeAnnotation` → `returnType`;
- `TSTypeParameter.name` string → `Identifier`;
- dynamic `import()` becomes `ImportExpression`;
- `BigIntLiteral.value` becomes a `bigint`;
- several other TS node shapes change. ([official Babel 8 API migration guide](https://babeljs.io/docs/v8-migration-api#ast-changes))

Vue Vine directly reads Babel 7 fields in macro analysis: `macroCall.typeParameters` in several places and `TSFunctionType.parameters` in slot analysis ([`analyze.ts`](https://github.com/vue-vine/vue-vine/blob/bc827a87/packages/compiler/src/analyze.ts#L690-L710), [`analyze.ts` slot handling](https://github.com/vue-vine/vue-vine/blob/bc827a87/packages/compiler/src/analyze.ts#L985-L1015), [`validate.ts`](https://github.com/vue-vine/vue-vine/blob/bc827a87/packages/compiler/src/validate.ts#L1090-L1100)). Therefore parser 8 will cause both TypeScript compile failures (once types are aligned) and runtime analysis failures. **Upgrade parser and types together, then migrate all affected property reads and add AST regression tests before merging.**

### 4. reactive-vscode 1

The 1.0 refactor removed/replaced many APIs, including `defineConfigs`, `defineConfigObject`, `ConfigRef`-based config access, and `executeCommand`; the upstream refactor commit explicitly marks itself breaking and shows the removals ([upstream breaking refactor](https://github.com/KermanX/reactive-vscode/commit/806500b), [v1 config guide](https://github.com/KermanX/reactive-vscode/blob/ab3f4d83d3102d9754a9851acc8218c1677d23b5/docs/guide/config.md#use-in-extension)).

Required Vue Vine migration:

- `defineConfigs('vue-vine', { ... })` → `defineConfig<Shape>('vue-vine')`;
- `config.foo.value` → `config.foo` and assignment to `config.foo`;
- `executeCommand(...)` → `vscode.commands.executeCommand(...)`;
- review removed composables if used in future.

The package's v1 extension guide also recommends running composables inside `defineExtension()` so lifecycle scopes clean up disposables ([official extension guide](https://github.com/KermanX/reactive-vscode/blob/ab3f4d83d3102d9754a9851acc8218c1677d23b5/docs/guide/extension.md#L1-L40)). Vue Vine currently exports its own raw `activate`; wrapping lifecycle setup should be considered, though the immediate compile blockers are the removed APIs above.

### 5. Nuxt test-utils and Vitest

`@nuxt/test-utils` v4 was specifically released for Vitest 4. Its migration notes say v4 requires Vitest v4 and replaces `vite-node` with Vite's native Module Runner ([v4.0.0 release](https://github.com/nuxt/test-utils/releases/tag/v4.0.0)). Published `@nuxt/test-utils@4.0.3` declares `vitest: ^4.0.2` and `jsdom: >=27.4.0` peers ([package metadata](https://www.npmjs.com/package/@nuxt/test-utils/v/4.0.3)).

Thus PR #359's `vitest: 4.1.10` is correct, but its comment still says “requires Vitest v3.” Any Vitest 3 downgrade is an **incompatible combination**.

### 6. Rsbuild 2 and plugin-sass 2

The official v1→v2 guide states that Rsbuild 2 is pure ESM, requires Node 20.19+/22.12+, depends on Rspack 2, raises default browser targets, changes the default server host, and changes several configuration/plugin APIs ([official migration guide](https://rsbuild.rs/guide/upgrade/v1-to-v2)). `@rsbuild/plugin-sass@2` is also pure ESM, drops Rsbuild 1 support, and declares `@rsbuild/core:^2.0.0` ([Rsbuild releases](https://github.com/web-infra-dev/rsbuild/releases/tag/v2.1.0), [package metadata](https://www.npmjs.com/package/@rsbuild/plugin-sass/v/2.0.1)).

The visible Vue Vine Rsbuild configs use supported options (`resolve.alias`, normal plugins) and do not use removed webpack APIs ([e2e config](https://github.com/vue-vine/vue-vine/blob/bc827a87/packages/e2e-rsstack/rsbuild.config.ts)). The **incompatibility is dependency-level**: PR #359 upgrades `@rsbuild/core` to 2 while leaving direct `@rspack/core` at 1.7.12; `@vue-vine/rspack-loader` publishes that 1.x range as both dependency and peer ([loader package](https://github.com/vue-vine/vue-vine/blob/bc827a87/packages/rspack-loader/package.json#L38-L50)). Align the catalog and published peer compatibility with Rspack 2, then run loader/plugin E2E tests.

### 7. Pinia 4

Pinia 4's release says its only technical breaks are pure ESM and upgrading `@vue/devtools-api`, which must now be installed alongside Pinia ([Pinia 4.0.0 release](https://github.com/vuejs/pinia/releases/tag/v4.0.0)). `pinia@4.0.2` peers on Vue `^3.5.11`, TypeScript `>=5.6`, and `@vue/devtools-api:^8.1.5` ([package metadata](https://www.npmjs.com/package/pinia/v/4.0.2)).

Vue Vine's application/template usage is standard `createPinia`/`defineStore`, under ESM Vite/Rsbuild projects, so no code migration is indicated. Ensure generated projects install the devtools peer (modern package managers normally do) and do not promise CommonJS support.

### 8. execa 10

Execa 10 requires Node 22 and changes the returned subprocess from a `ChildProcess` augmented with promise methods to a normal promise; Node-specific child-process methods move under `subprocess.nodeChildProcess`. Execa's documented methods remain ([v10.0.0 release](https://github.com/sindresorhus/execa/releases/tag/v10.0.0)).

Vue Vine only uses named `execa`, `execaSync`, result typing, and awaited output; it does not call `.on()`, `.send()`, `.ref()`, or `.unref()` ([package-manager helper](https://github.com/vue-vine/vue-vine/blob/bc827a87/packages/create-vue-vine/src/utils/pm.ts)). No source migration is required, but Node 22 becomes mandatory.

### 9. lint-staged 17

The sole v17 major release change is dropping Node 20; minimum Node is `22.22.1` ([v17.0.0 release](https://github.com/lint-staged/lint-staged/releases/tag/v17.0.0)). Vue Vine's package.json uses a conventional glob-to-string-command configuration, so no config migration is needed. This is stricter than tsdown's Node 22.18 floor and should be reflected in workspace engine/CI policy.

### 10. magic-string 1

Magic String 1 is pure ESM and drops CJS, UMD, and IIFE builds; the release describes the API as stable and identifies packaging as the breaking change ([v1.0.0 release](https://github.com/Rich-Harris/magic-string/releases/tag/v1.0.0)). Vue Vine is ESM and uses only the default `MagicString` API, so this is safe for repository code. Published Vue Vine packages are also ESM; only undocumented CommonJS consumers would be affected.

### 11. ts-morph 28

The 28.0.0 changelog identifies its breaking change as upgrading the embedded compiler to TypeScript 6.0; it also adds `printStructure` and fixes `addTypeArgument` ([upstream changelog](https://github.com/dsherret/ts-morph/blob/c895bee3cca5b602b9d8a016804989faa2cefafa/packages/ts-morph/CHANGELOG.md#L3-L10)). Vue Vine uses stable `Project`, `Node`, `Type`, and `TypeChecker` APIs, not APIs called out as removed. Treat as likely safe, but run compiler type-resolution tests because inference/printing can change with the embedded TS version.

### 12. @antfu/eslint-config 9

The v9 release's only declared breaking change is updating the React ESLint plugin to v5 and consolidating renamed React plugin namespaces/rules ([v9.0.0 release](https://github.com/antfu/eslint-config/releases/tag/v9.0.0), [source diff](https://github.com/antfu/eslint-config/compare/v8.3.0...v9.0.0)). Vue Vine's root config enables pnpm and repository rules, not React ([`eslint.config.js`](https://github.com/vue-vine/vue-vine/blob/bc827a87/eslint.config.js)). No migration is expected; lint output may still change from transitive rule updates and should be verified.

### 13. vite-plugin-inspect 12

v12 narrows the peer dependency from Vite 6/7/8 to `vite:^8.0.0-0` and migrates internals to Vite DevTools Kit; the default `Inspect()` plugin entry remains ([v11.4.1→v12.0.0 source comparison](https://github.com/antfu-collective/vite-plugin-inspect/compare/v11.4.1...v12.0.0), [`v12.0.2` package](https://www.npmjs.com/package/vite-plugin-inspect/v/12.0.2)). PR #359 also installs Vite 8.1.5 and Vue Vine uses only `Inspect()`, so this pairing is safe. Vite 7 + plugin-inspect 12 would be incompatible.

### 14. jsdom 30

`jsdom@30.0.0` declares a strict Node engine of `^22.22.2 || ^24.15.0 || >=26.0.0` ([package source](https://github.com/jsdom/jsdom/blob/20a01fc4a5ca1b2a48ec9c546d230624964d2f83/package.json#L121-L126), [published package](https://www.npmjs.com/package/jsdom/v/30.0.0)). Vue Vine does not directly instantiate `JSDOM`, `VirtualConsole`, or `ResourceLoader`; jsdom is a Vitest environment dependency in E2E packages. No code migration was found, but installations/tests fail on earlier Node 22/24 minors. The repository should declare or test the effective floor instead of relying only on `lts/*`.

### 15. @changesets/changelog-github 0.7

0.7 adds only a `disableThanks` option ([official changelog](https://github.com/changesets/changesets/blob/d1ef2d8cc11f86042a82f0cf7b125021e24dafc4/packages/changelog-github/CHANGELOG.md#L1-L8)). Vue Vine's Changesets config uses `@changesets/cli/changelog`, not `@changesets/changelog-github` ([`.changeset/config.json`](https://github.com/vue-vine/vue-vine/blob/bc827a87/.changeset/config.json)), and the latter appears only as an unused VS Code extension dev dependency. The upgrade is safe; consider removing the unused dependency separately.

## Merge blockers and recommended order

1. Keep Babel parser and types on major 8 together and retain the AST regression coverage.
2. Keep Microsoft's TS 7 + `@typescript/typescript6` side-by-side layout until TS 7.1 provides the programmatic API required by Volar and typescript-eslint.
3. Keep `@nuxt/test-utils@4` with **Vitest 4**.
4. Keep Rsbuild, plugin-sass, and direct Rspack on major 2 together.
5. Retain the reactive-vscode 1 source migration.
6. Keep the project Node floor at `>=24.15.0`, satisfying jsdom 30 and the other upgraded tools.
7. Continue validating the complete build, lint, unit, and E2E suite when Dependabot refreshes this grouped PR.
