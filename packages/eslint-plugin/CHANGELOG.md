# @vue-vine/eslint-plugin

## 0.2.20

### Patch Changes

- Fix for #243 that only update event names completion in current opened file.
- Updated dependencies
  - @vue-vine/eslint-parser@0.2.20

## 0.2.19

### Patch Changes

- Add auto-fix for component/HTML tag self-closing.
- Updated dependencies
  - @vue-vine/eslint-parser@0.2.19

## 0.2.18

### Patch Changes

- Add rules for some essential restrictions.
- Updated dependencies
  - @vue-vine/eslint-parser@0.2.18

## 0.2.17

### Patch Changes

- Add new rule for making vineExpose at function body tail.
- Updated dependencies
  - @vue-vine/eslint-parser@0.2.17

## 0.2.16

### Patch Changes

- Support vue 3.4 feature: v-bind shorthand

## 0.2.15

### Patch Changes

- Fix dependencies for Vue Vine ESLint packages.

## 0.2.14

### Patch Changes

- Fix incorrect position of 'export default' statement generation in Vine compiler.

## 0.2.13

### Patch Changes

- Bump package version due to pnpm catalog config incorrectly in previous version.

## 0.2.11

### Patch Changes

- Fix compatibility issue with unplugin-auto-import.

## 0.2.10

### Patch Changes

- Fix format should warn incorrectly in plain text case

## 0.2.9

### Patch Changes

- Fix template format broken in multi-line comment and add new rule 'prefer-template' (fork from ESLint built-in rule)

## 0.2.7

### Patch Changes

- Fix #168 import specifier usage checking in template and its perf improving.

## 0.2.4

### Patch Changes

- Fix compiler should remove unused-in-template bindings in separated mode returns.

## 0.2.3

### Patch Changes

- Fix exports field 'node' is useless for VSCode

## 0.2.2

### Patch Changes

- Fix props with default value should be optional.

## 0.2.1

### Patch Changes

- Add no-dupe-else-if and no-dupe-attributes rules.

## 0.2.0

### Minor Changes

- Fix incorrect location for ESLint parse results and add new no-child-content rule.

## 0.0.6

### Patch Changes

- Support format Vine component function name as PascalCase.

## 0.0.5

### Patch Changes

- Fix incorrect token position in ESLint parsing result.

## 0.0.4

### Patch Changes

- Support formatting Vue Vine template.

## 0.0.3

### Patch Changes

- Add format-vine-macros-leading rule.
