# create-vue-vine

## 1.6.3

### Patch Changes

- Fix extension broken on toPascalCase transform

## 1.6.2

### Patch Changes

- Support document symbol semantic highlighting

## 1.6.1

### Patch Changes

- Fix the missing feature support of custom elements.

## 1.6.0

### Minor Changes

- Update new typing and functionality of initVibe.

## 1.5.7

### Patch Changes

- Fix ESLint format autofix for style/indent rule.

## 1.5.6

### Patch Changes

- Fix conflict when user giving useTemplateRef type param.

## 1.5.5

### Patch Changes

- Fix VSCode extension for not showing 'Channel has been closed' error

## 1.5.4

### Patch Changes

- Fix JSX compatibility regression issue and give option to turn off 'format-prefer-template' in vine template

## 1.5.3

### Patch Changes

- Revert track methods to just use events to report.

## 1.5.2

### Patch Changes

- Improve event track to a more clear view.

## 1.5.1

### Patch Changes

- Support new track event for virtual code generation.

## 1.5.0

### Minor Changes

- Support events data collection in VSCode extension.

## 1.4.11

### Patch Changes

- Fix eslint formatting for template when it's totally empty, Add missing import not working when referencing component tag name, Add import('vue').ComponentPublicInstance to support $xx in template

## 1.4.10

### Patch Changes

- Supplement missing VLS prefix for OmitAny.

## 1.4.9

### Patch Changes

- Fix virtual code generation strategy and generics type issue.

## 1.4.8

### Patch Changes

- Reconciliation version for fixing messed up dependencies.

## 1.4.7

### Patch Changes

- Support showing JSDoc for vineProp declaration.

## 1.4.6

### Patch Changes

- Revert using transformWithOxc to avoid breaking in legacy Vite.

## 1.4.5

### Patch Changes

- Feature support for referencing directives in language service.

## 1.4.4

### Patch Changes

- Fix language service for vine file folding ranges.

## 1.4.3

### Patch Changes

- Fix virtual code generation incorrectly on props intersection type.

## 1.4.2

### Patch Changes

- Fix language service for component reference name.

## 1.4.1

### Patch Changes

- Fix HTMLAttributes type by import from vue.

## 1.4.0

### Minor Changes

- Fix default value issue for boolean props.

## 1.3.5

### Patch Changes

- Fix panic when Vite hot update and ts-morph can't get source file (in Slidev .md case).

## 1.3.4

### Patch Changes

- Support an additional option for user-given tsconfig file path

## 1.3.3

### Patch Changes

- Support Slidev auto import by providing a plugin from Vue Vine.

## 1.3.2

### Patch Changes

- Support '!foo' style props feature in language service.

## 1.3.1

### Patch Changes

- Stability enhancement update: check #266 for more details.

## 1.3.0

### Minor Changes

- Support transform boolean props syntax sugar.

## 1.2.1

### Patch Changes

- Support missing feature: transform asset url and fix unexpected compiler error in VSCode.

## 1.2.0

### Minor Changes

- More robust boolean type check for vineProp.

## 1.1.0

### Minor Changes

- Migrate vite plugin to not enforce: pre

## 1.0.3

### Patch Changes

- Fix broken external style import and support scoped class reference.

## 1.0.2

### Patch Changes

- Switch to tailwind 4 based configs.

## 1.0.1

### Patch Changes

- Support completions on native element events.

## 1.0.0

### Major Changes

- Migrate Vue Vine to ESM only and bundled by tsdown.

## 0.2.3

### Patch Changes

- Shouldn't add exposed type in component function context when no exposed data.

## 0.2.2

### Patch Changes

- Fix for #243 that only update event names completion in current opened file.

## 0.2.0

### Minor Changes

- Refactoring transform code and fix HMR when renaming function

## 0.1.9

### Patch Changes

- Fix language service for virtual code generation as it should be sorted

## 0.1.8

### Patch Changes

- Fix vineExpose in compile time, allowing it expose anything

## 0.1.7

### Patch Changes

- Fix vscode extension broken by ts-morph not initialized.

## 0.1.6

### Patch Changes

- Support new macro `vineValidators`

## 0.1.5

### Patch Changes

- Support intellisense and navigation in useTemplateRef.

## 0.1.4

### Patch Changes

- Bump dependencies' version.

## 0.1.3

### Major Changes

- Add `pinia`, `tailwindcss` template and make pages more prettier.
- Bump package version due to pnpm catalog config incorrectly in previous version.

## 0.0.5

### Patch Changes

- Bump Vue/Vite/Vine version in template.

## 0.0.4

### Patch Changes

- Fix CLI templates should export component functions.

## 0.0.3

### Patch Changes

- Add Vue Vine ESLint config to project template

## 0.0.1

### Minor Changes

- Announce the first stable version of Vue Vine! Please check more details on docs site: https://vue-vine.dev
