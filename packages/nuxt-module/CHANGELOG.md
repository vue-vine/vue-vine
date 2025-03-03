# @vue-vine/nuxt

## 0.2.18

### Patch Changes

- Fix language service and implement pipeline server to fetch component info.
- Updated dependencies
  - vue-vine@0.3.18

## 0.2.17

### Patch Changes

- Fix language service for shallow unref VLS context.
- Updated dependencies
  - vue-vine@0.3.17

## 0.2.16

### Patch Changes

- Fix language service navigation and upgrade TS to v5.7.3.
- Updated dependencies
  - vue-vine@0.3.16

## 0.2.15

### Patch Changes

- Fix compiler for auto-import components broken in inline-template mode.
- Updated dependencies
  - vue-vine@0.3.15

## 0.2.14

### Patch Changes

- Fix completions for auto-import components.
- Updated dependencies
  - vue-vine@0.3.14

## 0.2.13

### Patch Changes

- Fix missing used-in-template binding records for virtual code.
- Updated dependencies
  - vue-vine@0.3.13

## 0.2.12

### Patch Changes

- Fix virtual code combining behavior aliging with Vue language tools.
- Updated dependencies
  - vue-vine@0.3.12

## 0.2.11

### Patch Changes

- Fix missing expose types in language service.
- Updated dependencies
  - vue-vine@0.3.11

## 0.2.10

### Patch Changes

- Fix language service - add missing common props for component.
- Updated dependencies
  - vue-vine@0.3.10

## 0.2.9

### Patch Changes

- Fix language service types issue - conflicts with implicit any

## 0.2.8

### Patch Changes

- Move compiler HMR inject code into Vite plugin for bundler agnostic.

## 0.2.7

### Patch Changes

- Fix Nuxt pages mapping compatible issue with Vue Vine.

## 0.2.6

### Patch Changes

- Fix HMR stability issue.

## 0.2.5

### Patch Changes

- Fix undefined handling in HMR when ts-morph resolving.

## 0.2.4

### Patch Changes

- Bump vue language tool v2.2.2 and fix default value in ts-morph case.

## 0.2.3

### Patch Changes

- Re-implement the way of obtaining tsconfig and remove useless dependencies

## 0.2.2

### Patch Changes

- Supplement some important feature support of vineModel.

## 0.2.1

### Patch Changes

- Fix props destructure incompatible with useDefaults.

## 0.2.0

### Minor Changes

- New feature: support props destructure, same as Vue 3.5

## 0.1.9

### Patch Changes

- Fix ts-morph can't automatically handle tsconfig references child projects.

## 0.1.7

### Patch Changes

- Fix incorrect position of 'export default' statement generation in Vine compiler.
- Upgrade to Nuxt module builder v1.

## 0.1.5

### Patch Changes

- Bump package version due to pnpm catalog config incorrectly in previous version.

## 0.1.3

### Patch Changes

- Decrease vscode extension bundle size.

## 0.1.2

### Patch Changes

- Fix hot-updated module which are not .vine.ts should trigger Vine importer module updates

## 0.1.1

### Patch Changes

- Emits defined by names should be optional

## 0.1.0

### Minor Changes

- Support resolve props from external type with ts-morph

## 0.0.11

### Patch Changes

- Fix compiler transform for top-level await in component function body.

## 0.0.10

### Patch Changes

- Fix compatibility issue with unplugin-auto-import.

## 0.0.8

### Patch Changes

- Fix #168 import specifier usage checking in template and its perf improving.

## 0.0.7

### Patch Changes

- Fix compiler should add withAsyncContext helper import from vue when transforming.

## 0.0.5

### Patch Changes

- Enable strictTemplates option in VSCode extension for template checking.

## 0.0.4

### Patch Changes

- Fix compiler should remove unused-in-template bindings in separated mode returns.

## 0.0.3

### Patch Changes

- Fix props with default value should be optional.

## 0.0.2

Fix linked dependency version to main package.

## 0.0.1

Announcing the first release of @vue-vine/nuxt.
