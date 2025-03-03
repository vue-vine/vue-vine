# @vue-vine/compiler

## 0.3.18

### Patch Changes

- Fix language service and implement pipeline server to fetch component info.

## 0.3.17

### Patch Changes

- Fix language service for shallow unref VLS context.

## 0.3.16

### Patch Changes

- Fix language service navigation and upgrade TS to v5.7.3.

## 0.3.15

### Patch Changes

- Fix compiler for auto-import components broken in inline-template mode.

## 0.3.14

### Patch Changes

- Fix completions for auto-import components.

## 0.3.13

### Patch Changes

- Fix missing used-in-template binding records for virtual code.

## 0.3.12

### Patch Changes

- Fix virtual code combining behavior aliging with Vue language tools.

## 0.3.11

### Patch Changes

- Fix missing expose types in language service.

## 0.3.10

### Patch Changes

- Fix language service - add missing common props for component.

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

## 0.1.36

### Patch Changes

- Enable strictTemplates option in VSCode extension for template checking.

## 0.1.35

### Patch Changes

- Fix compiler should remove unused-in-template bindings in separated mode returns.

## 0.1.34

### Patch Changes

- Fix props with default value should be optional.

## 0.1.29

### Patch Changes

- Fix feature of folding support for component functions.

## 0.1.27

### Patch Changes

- Support navigating to definition for vineSlots and vineEmits.

## 0.1.26

### Patch Changes

- Fix vscode extension diagnostics location incorrect.

## 0.1.24

### Patch Changes

- Fix vineEmits analysis feature for plain event names feature which is not complete

## 0.1.23

### Patch Changes

- Fix vineEmits validation on type parameter or call arg.

## 0.1.20

### Patch Changes

- fix vite-plugin read styleDefine of undefined.

## 0.1.19

### Patch Changes

- Update version with SSR support features.

## 0.1.18

### Patch Changes

- Fix HMR style update after support multiple vineStyle.

## 0.1.17

### Patch Changes

- Support multiple vineStyle macro.

## 0.1.16

### Patch Changes

- Fix package exports specification for Node ESM and error capture in Vite plugin.

## 0.1.12

### Patch Changes

- Fix async function component support in compiler and extension.

## 0.1.10

### Patch Changes

- Support using export default declaration for component function.

## 0.1.8

### Patch Changes

- Add validation for bare macro call and enhance VSCode extension for accurate type display.

## 0.1.6

### Patch Changes

- fix(compiler): support multiple declarator and export default statement.

## 0.1.5

### Patch Changes

- fix(compiler): parse simple function component definition.

## 0.1.2

### Patch Changes

- fix(compiler): vineEmits codegen incorrect

## 0.1.0

### Minor Changes

- Announce the first stable version of Vue Vine! Please check more details on docs site: https://vue-vine.dev
