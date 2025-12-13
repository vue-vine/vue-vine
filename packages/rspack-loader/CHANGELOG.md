# @vue-vine/rspack-loader

## 1.7.27

### Patch Changes

- Fix language service for broken on concating props type in virtual code.
- Updated dependencies
  - @vue-vine/compiler@1.7.27

## 1.7.26

### Patch Changes

- Support reference & navigation for vineModel props.
- Updated dependencies
  - @vue-vine/compiler@1.7.26

## 1.7.25

### Patch Changes

- Add lint rule for recommending event names to be camelCase.
- Updated dependencies
  - @vue-vine/compiler@1.7.25

## 1.7.24

### Patch Changes

- Support vineModel destructure as array pattern and get modifiers.
- Updated dependencies
  - @vue-vine/compiler@1.7.24

## 1.7.23

### Patch Changes

- Improve language service performance by not creating another TS project instance.
- Updated dependencies
  - @vue-vine/compiler@1.7.23

## 1.7.22

### Patch Changes

- Fix compiler for support simple annonymous vine arrow fn expr as default export.
- Updated dependencies
  - @vue-vine/compiler@1.7.22

## 1.7.21

### Patch Changes

- Set rspack/rsbuild to official and fix missing VLS_elements variable declaration.
- Updated dependencies
  - @vue-vine/compiler@1.7.21

## 1.7.20-beta.1

### Patch Changes

- Fix compiler for correctly handling kebab-case props in transform phase.
- Updated dependencies
  - @vue-vine/compiler@1.7.20

## 1.7.19-beta.1

### Patch Changes

- Fix lang-service for incorrect reference emits type name.
- Updated dependencies
  - @vue-vine/compiler@1.7.19

## 1.7.18-beta.1

### Patch Changes

- Fix language service for missing referencing type declarations in generated dts.
- Updated dependencies
  - @vue-vine/compiler@1.7.18

## 1.7.17-beta.1

### Patch Changes

- Cancel error report for using typename as slot props type annotation.
- Updated dependencies
  - @vue-vine/compiler@1.7.17

## 1.7.16-beta.1

### Patch Changes

- Supplement fix for empty slots props validation in compiler.
- Updated dependencies
  - @vue-vine/compiler@1.7.16

## 1.7.15-beta.1

### Patch Changes

- Allow empty slot props definition and no error diagnostics.
- Updated dependencies
  - @vue-vine/compiler@1.7.15

## 1.7.14-beta.1

### Patch Changes

- Refactor usage of magic-string in compiler to ensure more accurate sourcemap mapping.
- Updated dependencies
  - @vue-vine/compiler@1.7.14

## 1.7.13-beta.1

### Patch Changes

- Support initializing project with Rsbuild in scaffold CLI.
- Updated dependencies
  - @vue-vine/compiler@1.7.13

## 1.7.12-beta.1

### Patch Changes

- Support rsbuild plugin and add export entry in main package.
- Updated dependencies
  - @vue-vine/compiler@1.7.12

## 1.7.11-beta.2

- Support Rsbuild plugin.

## 1.7.11-beta.1

- Refactor common logic and ready to release (beta) Rspack support.
- Updated dependencies
  - @vue-vine/compiler@1.7.11
