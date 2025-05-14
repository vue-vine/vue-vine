# @vue-vine/language-service

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
- Add feature for restart Vine language server.
- Remove re-compile time in performance observability log.

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
