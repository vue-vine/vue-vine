# vue-vine-tsc

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

## 0.1.6

### Patch Changes

- Fix type checking while passing props on `<slots />`

## 0.1.5

### Patch Changes

- Bump package version due to pnpm catalog config incorrectly in previous version.

## 0.1.4

### Patch Changes

- Fix virtual code VLS context binding names to be PascalCase.

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

## 0.0.13

### Patch Changes

- Fix compiler transform for top-level await in component function body.

## 0.0.12

### Patch Changes

- Fix compatibility issue with unplugin-auto-import.

## 0.0.11

### Patch Changes

Fix:

- (1) Navigation failed between multiple files
- (2) Optional emits type infer not correct.

## 0.0.10

### Patch Changes

- Fix #168 import specifier usage checking in template and its perf improving.

## 0.0.9

### Patch Changes

- Fix compiler should add withAsyncContext helper import from vue when transforming.

## 0.0.8

### Patch Changes

- Fix checking required props for template in VSCode.

## 0.0.7

### Patch Changes

- Enable strictTemplates option in VSCode extension for template checking.

## 0.0.6

### Patch Changes

- Fix compiler should remove unused-in-template bindings in separated mode returns.

## 0.0.5

### Patch Changes

- Fix props with default value should be optional.

## 0.0.4

### Patch Changes

- Fix incorrectly generate global types file path.

## 0.0.3

### Patch Changes

Bump depedencies to vue-language-tools v2.1.8
