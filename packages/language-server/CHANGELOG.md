# @vue-vine/language-server

## 0.3.0

### Minor Changes

- New feature: support props destructure, same as Vue 3.5

## 0.2.9

### Patch Changes

- Fix ts-morph can't automatically handle tsconfig references child projects.

## 0.2.7

### Patch Changes

- Fix incorrect position of 'export default' statement generation in Vine compiler.

## 0.2.6

### Patch Changes

- Fix type checking while passing props on `<slots />`

## 0.2.5

### Patch Changes

- Bump package version due to pnpm catalog config incorrectly in previous version.

## 0.2.4

### Patch Changes

- Fix virtual code VLS context binding names to be PascalCase.

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

## 0.1.40

### Patch Changes

Fix:

- (1) Navigation failed between multiple files
- (2) Optional emits type infer not correct.

## 0.1.39

### Patch Changes

- Fix #168 import specifier usage checking in template and its perf improving.

## 0.1.38

### Patch Changes

- Fix compiler should add withAsyncContext helper import from vue when transforming.

## 0.1.37

### Patch Changes

- Fix checking required props for template in VSCode.

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

## 0.1.28

### Patch Changes

- Fix incorrectly generate global types file path.

## 0.1.27

### Patch Changes

- Support navigating to definition for vineSlots and vineEmits.

## 0.1.26

### Patch Changes

- Fix vscode extension diagnostics location incorrect.

## 0.1.25

### Patch Changes

- feat(vscode-ext): support tag prop/event intellisense

## 0.1.23

### Patch Changes

- Support jump to definition for vineProp macro

## 0.1.21

### Patch Changes

- Update Vue language tools to v2.1.6

## 0.1.15

### Patch Changes

- Fix folding issue for Vine component function

## 0.1.14

### Patch Changes

- Support template tag intellisense from available bindings.

## 0.1.13

### Patch Changes

- Fix wrong parameters for ts plugin.

## 0.1.9

### Patch Changes

- Cleaner inject types in virtual code.

## 0.1.8

### Patch Changes

- Add validation for bare macro call and enhance VSCode extension for accurate type display.

## 0.1.7

### Patch Changes

- fix VSCode extension crash and feature enhancement, provide diagnostics.

## 0.1.0

### Minor Changes

- Announce the first stable version of Vue Vine! Please check more details on docs site: https://vue-vine.dev
