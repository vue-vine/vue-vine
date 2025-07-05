# @vue-vine/vite-plugin

## 1.5.7

### Patch Changes

- Fix ESLint format autofix for style/indent rule.
- Updated dependencies
  - @vue-vine/compiler@1.5.7

## 1.5.6

### Patch Changes

- Fix conflict when user giving useTemplateRef type param.
- Updated dependencies
  - @vue-vine/compiler@1.5.6

## 1.5.5

### Patch Changes

- Fix VSCode extension for not showing 'Channel has been closed' error
- Updated dependencies
  - @vue-vine/compiler@1.5.5

## 1.5.4

### Patch Changes

- Fix JSX compatibility regression issue and give option to turn off 'format-prefer-template' in vine template
- Updated dependencies
  - @vue-vine/compiler@1.5.4

## 1.5.3

### Patch Changes

- Revert track methods to just use events to report.
- Updated dependencies
  - @vue-vine/compiler@1.5.3

## 1.5.2

### Patch Changes

- Improve event track to a more clear view.
- Updated dependencies
  - @vue-vine/compiler@1.5.2

## 1.5.1

### Patch Changes

- Support new track event for virtual code generation.
- Updated dependencies
  - @vue-vine/compiler@1.5.1

## 1.5.0

### Minor Changes

- Support events data collection in VSCode extension.

### Patch Changes

- Updated dependencies
  - @vue-vine/compiler@1.5.0

## 1.4.11

### Patch Changes

- Fix eslint formatting for template when it's totally empty, Add missing import not working when referencing component tag name, Add import('vue').ComponentPublicInstance to support $xx in template
- Updated dependencies
  - @vue-vine/compiler@1.4.11

## 1.4.10

### Patch Changes

- Supplement missing VLS prefix for OmitAny.
- Updated dependencies
  - @vue-vine/compiler@1.4.10

## 1.4.9

### Patch Changes

- Fix virtual code generation strategy and generics type issue.
- Updated dependencies
  - @vue-vine/compiler@1.4.9

## 1.4.8

### Patch Changes

- Reconciliation version for fixing messed up dependencies.
- Updated dependencies
  - @vue-vine/compiler@1.4.8

## 1.4.7

### Patch Changes

- Support showing JSDoc for vineProp declaration.
- Updated dependencies
  - @vue-vine/compiler@1.4.7

## 1.4.6

### Patch Changes

- Revert using transformWithOxc to avoid breaking in legacy Vite.
- Updated dependencies
  - @vue-vine/compiler@1.4.6

## 1.4.5

### Patch Changes

- Feature support for referencing directives in language service.
- Updated dependencies
  - @vue-vine/compiler@1.4.5

## 1.4.4

### Patch Changes

- Fix language service for vine file folding ranges.
- Updated dependencies
  - @vue-vine/compiler@1.4.4

## 1.4.3

### Patch Changes

- Fix virtual code generation incorrectly on props intersection type.
- Updated dependencies
  - @vue-vine/compiler@1.4.3

## 1.4.2

### Patch Changes

- Fix language service for component reference name.
- Updated dependencies
  - @vue-vine/compiler@1.4.2

## 1.4.1

### Patch Changes

- Fix HTMLAttributes type by import from vue.
- Updated dependencies
  - @vue-vine/compiler@1.4.1

## 1.4.0

### Minor Changes

- Fix default value issue for boolean props.

### Patch Changes

- Updated dependencies
  - @vue-vine/compiler@1.4.0

## 1.3.5

### Patch Changes

- Fix panic when Vite hot update and ts-morph can't get source file (in Slidev .md case).
- Updated dependencies
  - @vue-vine/compiler@1.3.5

## 1.3.4

### Patch Changes

- Support an additional option for user-given tsconfig file path
- Updated dependencies
  - @vue-vine/compiler@1.3.4

## 1.3.3

### Patch Changes

- Support Slidev auto import by providing a plugin from Vue Vine.
- Updated dependencies
  - @vue-vine/compiler@1.3.3

## 1.3.2

### Patch Changes

- Support '!foo' style props feature in language service.
- Updated dependencies
  - @vue-vine/compiler@1.3.2

## 1.3.1

### Patch Changes

- Stability enhancement update: check #266 for more details.
- Updated dependencies
  - @vue-vine/compiler@1.3.1

## 1.3.0

### Minor Changes

- Support transform boolean props syntax sugar.

### Patch Changes

- Updated dependencies
  - @vue-vine/compiler@1.3.0

## 1.2.1

### Patch Changes

- Support missing feature: transform asset url and fix unexpected compiler error in VSCode.
- Updated dependencies
  - @vue-vine/compiler@1.2.1

## 1.2.0

### Minor Changes

- More robust boolean type check for vineProp.

### Patch Changes

- Updated dependencies
  - @vue-vine/compiler@1.2.0

## 1.1.0

### Minor Changes

- Migrate vite plugin to not enforce: pre

### Patch Changes

- Updated dependencies
  - @vue-vine/compiler@1.1.0

## 1.0.3

### Patch Changes

- Fix broken external style import and support scoped class reference.
- Updated dependencies
  - @vue-vine/compiler@1.0.3

## 1.0.2

### Patch Changes

- Support completions on native element events.
- Updated dependencies
  - @vue-vine/compiler@1.0.2

## 1.0.1

### Patch Changes

- Fix language service pipeline server for supporting request ID.
- Updated dependencies
  - @vue-vine/compiler@1.0.1

## 1.0.0

### Major Changes

- Migrate Vue Vine to ESM only and bundled by tsdown.

### Patch Changes

- Updated dependencies
  - @vue-vine/compiler@1.0.0

## 0.5.3

### Patch Changes

- Shouldn't add exposed type in component function context when no exposed data.
- Updated dependencies
  - @vue-vine/compiler@0.5.3

## 0.5.2

### Patch Changes

- Fix for #243 that only update event names completion in current opened file.
- Updated dependencies
  - @vue-vine/compiler@0.5.2

## 0.5.1

### Patch Changes

- Fix language service for not updating component event completion items.
- Updated dependencies
  - @vue-vine/compiler@0.5.1

## 0.5.0

### Minor Changes

- Refactoring transform code and fix HMR when renaming function

### Patch Changes

- Updated dependencies
  - @vue-vine/compiler@0.5.0

## 0.4.4

### Patch Changes

- Verify compatibility of Vine mixing with JSX
- Updated dependencies
  - @vue-vine/compiler@0.4.4

## 0.4.3

### Patch Changes

- Fix language service for virtual code generation as it should be sorted
- Updated dependencies
  - @vue-vine/compiler@0.4.3

## 0.4.2

### Patch Changes

- Fix vineExpose in compile time, allowing it expose anything
- Updated dependencies
  - @vue-vine/compiler@0.4.2

## 0.4.1

### Patch Changes

- Fix vscode extension broken by ts-morph not initialized.
- Updated dependencies
  - @vue-vine/compiler@0.4.1

## 0.4.0

### Minor Changes

- Support new macro `vineValidators`

### Patch Changes

- Updated dependencies
  - @vue-vine/compiler@0.4.0

## 0.3.22

### Patch Changes

- Fix props analysis when type literal contains generic parameter.
- Updated dependencies
  - @vue-vine/compiler@0.3.22

## 0.3.21

### Patch Changes

- Fixing incorrect inferred type by useTemplateRef.
- Updated dependencies
  - @vue-vine/compiler@0.3.21

## 0.3.20

### Patch Changes

- Support intellisense and navigation in useTemplateRef.
- Updated dependencies
  - @vue-vine/compiler@0.3.20

## 0.3.19

### Patch Changes

- Implement TypeScript language service proxy.
- Updated dependencies
  - @vue-vine/compiler@0.3.19

## 0.3.18

### Patch Changes

- Fix language service and implement pipeline server to fetch component info.
- Updated dependencies
  - @vue-vine/compiler@0.3.18

## 0.3.17

### Patch Changes

- Fix language service for shallow unref VLS context.
- Updated dependencies
  - @vue-vine/compiler@0.3.17

## 0.3.16

### Patch Changes

- Fix language service navigation and upgrade TS to v5.7.3.
- Updated dependencies
  - @vue-vine/compiler@0.3.16

## 0.3.15

### Patch Changes

- Fix compiler for auto-import components broken in inline-template mode.
- Updated dependencies
  - @vue-vine/compiler@0.3.15

## 0.3.14

### Patch Changes

- Fix completions for auto-import components.
- Updated dependencies
  - @vue-vine/compiler@0.3.14

## 0.3.13

### Patch Changes

- Fix missing used-in-template binding records for virtual code.
- Updated dependencies
  - @vue-vine/compiler@0.3.13

## 0.3.12

### Patch Changes

- Fix virtual code combining behavior aliging with Vue language tools.
- Updated dependencies
  - @vue-vine/compiler@0.3.12

## 0.3.11

### Patch Changes

- Fix missing expose types in language service.
- Updated dependencies
  - @vue-vine/compiler@0.3.11

## 0.3.10

### Patch Changes

- Fix language service - add missing common props for component.
- Updated dependencies
  - @vue-vine/compiler@0.3.10

## 0.3.9

### Patch Changes

- Fix language service types issue - conflicts with implicit any

## 0.3.8

### Patch Changes

- Move compiler HMR inject code into Vite plugin for bundler agnostic.

## 0.3.7

### Patch Changes

- Bump version to align with vscode extension.

## 0.3.6

### Patch Changes

- Fix HMR stability issue.

## 0.3.5

### Patch Changes

- Fix undefined handling in HMR when ts-morph resolving.

## 0.3.4

### Patch Changes

- Bump vue language tool v2.2.2 and fix default value in ts-morph case.

## 0.3.3

### Patch Changes

- Re-implement the way of obtaining tsconfig and remove useless dependencies

## 0.3.2

### Patch Changes

- Supplement some important feature support of vineModel.

## 0.3.1

### Patch Changes

- Fix props destructure incompatible with useDefaults.

## 0.3.0

### Minor Changes

- New feature: support props destructure, same as Vue 3.5

## 0.2.9

### Patch Changes

- Fix ts-morph can't automatically handle tsconfig references child projects.

## 0.2.7

### Patch Changes

- Fix incorrect position of 'export default' statement generation in Vine compiler.

## 0.2.5

### Patch Changes

- Bump package version due to pnpm catalog config incorrectly in previous version.

## 0.2.3

### Patch Changes

- Decrease vscode extension bundle size.

## 0.2.2

### Patch Changes

- Fix hot-updated module which are not .vine.ts should trigger Vine importer module updates

## 0.2.1

### Patch Changes

- Emits defined by names should be optional

## 0.2.0

### Minor Changes

- Support resolve props from external type with ts-morph

## 0.1.42

### Patch Changes

- Fix compiler transform for top-level await in component function body.

## 0.1.41

### Patch Changes

- Fix compatibility issue with unplugin-auto-import.

## 0.1.39

### Patch Changes

- Fix #168 import specifier usage checking in template and its perf improving.

## 0.1.38

### Patch Changes

- Fix compiler should add withAsyncContext helper import from vue when transforming.

## 0.1.35

### Patch Changes

- Fix compiler should remove unused-in-template bindings in separated mode returns.

## 0.1.34

### Patch Changes

- Fix props with default value should be optional.

## 0.1.22

### Patch Changes

- Fix hmr execute error by no vineStyle

## 0.1.20

### Patch Changes

- fix vite-plugin read styleDefine of undefined.

## 0.1.19

### Patch Changes

- Update version with SSR support features.
- Fix again HMR style update after support multiple vineStyle.

## 0.1.18

### Patch Changes

- Fix HMR style update after support multiple vineStyle.

## 0.1.16

### Patch Changes

- Fix package exports specification for Node ESM and error capture in Vite plugin.

## 0.1.1

### Patch Changes

- Fix HMR issue and remove peer dependency requirement for Vite plugin.

## 0.1.0

### Minor Changes

- Announce the first stable version of Vue Vine! Please check more details on docs site: https://vue-vine.dev
