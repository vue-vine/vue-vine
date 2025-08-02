# @vue-vine/eslint-parser

## 1.1.8

### Patch Changes

- Don't apply format change on empty line of template.

## 1.1.7

### Patch Changes

- Improve template formatting to align with Prettier result and add base indent.

## 1.1.6

### Patch Changes

- Fix indent format infinite loop

## 1.1.5

### Patch Changes

- Fix ESLint format autofix for style/indent rule.

## 1.1.4

### Patch Changes

- Fix JSX compatibility regression issue and give option to turn off 'format-prefer-template' in vine template

## 1.1.3

### Patch Changes

- Fix eslint formatting for template when it's totally empty, Add missing import not working when referencing component tag name, Add import('vue').ComponentPublicInstance to support $xx in template

## 1.1.2

### Patch Changes

- Fix PascalCase check in eslint rules.

## 1.1.1

### Patch Changes

- Fix eslint parser option for using ECMAScript latest as default.

## 1.1.0

### Minor Changes

- align type with Linter.Parser

## 1.0.0

### Major Changes

- Migrate Vue Vine to ESM only and bundled by tsdown.

## 0.2.20

### Patch Changes

- Fix for #243 that only update event names completion in current opened file.

## 0.2.19

### Patch Changes

- Add auto-fix for component/HTML tag self-closing.

## 0.2.18

### Patch Changes

- Add rules for some essential restrictions.

## 0.2.17

### Patch Changes

- Add new rule for making vineExpose at function body tail.

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

## 0.2.12

### Patch Changes

- Fix compiler transform for top-level await in component function body.

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

## 0.2.6

### Patch Changes

- Fix compiler should add withAsyncContext helper import from vue when transforming.

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

## 0.1.33

### Patch Changes

- Fix incorrect token position in ESLint parsing result.

## 0.1.32

### Patch Changes

- Support formatting Vue Vine template.

## 0.1.31

### Patch Changes

- Add format-vine-macros-leading rule.

## 0.1.30

### Patch Changes

- Fix incorrect published files in v0.1.29

## 0.1.11

### Patch Changes

- Fix ESLint parser for not reporting unused var on `props` formal parameter.

## 0.1.9

### Patch Changes

- Refactor ESLint parser for ESM and more accurate location.

## 0.1.5

### Patch Changes

- fix(compiler): Remove 'external' in bundle config to make sure this package don't lose any dependencies.

## 0.1.0

### Minor Changes

- Announce the first stable version of Vue Vine! Please check more details on docs site: https://vue-vine.dev
