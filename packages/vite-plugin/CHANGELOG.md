# @vue-vine/vite-plugin

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
