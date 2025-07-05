import type { ESLint, Linter } from 'eslint'
import type { Options as noChildContentOptions } from './rules/essentials/no-child-content'
import type { Options as noDupeAttributesOptions } from './rules/essentials/no-dupe-attributes'
import type { Options as noDupeElseIfOptions } from './rules/essentials/no-dupe-else-if'
import type { Options as formatHtmlSelfClosingOptions } from './rules/format/format-html-self-closing'
import type { Options as preferTemplateOptions } from './rules/format/format-prefer-template'
import type { Options as vineComponentNameFormatOptions } from './rules/format/format-vine-component-name'
import type { Options as vineExposeAtTailOptions } from './rules/format/format-vine-expose-at-tail'
import type { Options as vineMacrosLeadingOptions } from './rules/format/format-vine-macros-leading'
import type { Options as vineStyleIndentOptions } from './rules/format/format-vine-style-indent'
import type { Options as vineTemplateFormatOptions } from './rules/format/format-vine-template'

import VueVineESLintParser from '@vue-vine/eslint-parser'

import { version } from '../package.json'
// Essentials:
import noChildContent from './rules/essentials/no-child-content'

import noDupeAttributes from './rules/essentials/no-dupe-attributes'
import noDupeElseIf from './rules/essentials/no-dupe-else-if'
import noLifecycleHookAfterAwait from './rules/essentials/no-lifecycle-hook-after-await'
import noVForKeyOnChild from './rules/essentials/no-v-for-key-on-child'

// Formats:
import formatHtmlSelfClosing from './rules/format/format-html-self-closing'
import preferTemplate from './rules/format/format-prefer-template'
import vineComponentNameFormat from './rules/format/format-vine-component-name'
import vineExposeAtTail from './rules/format/format-vine-expose-at-tail'
import vineMacrosLeading from './rules/format/format-vine-macros-leading'
import vineStyleIndent from './rules/format/format-vine-style-indent'
import vineTemplateFormat from './rules/format/format-vine-template'

// Utils:
import { prettierSnapshot } from './utils'

const plugin: ESLint.Plugin = {
  meta: {
    name: 'vue-vine',
    version: version as string,
  },
  rules: {
    'essentials-no-child-content': noChildContent,
    'essentials-no-dupe-else-if': noDupeElseIf,
    'essentials-no-dupe-attributes': noDupeAttributes,
    'essentials-no-v-for-key-on-child': noVForKeyOnChild,
    'essentials-no-lifecycle-hook-after-await': noLifecycleHookAfterAwait,
    'format-vine-template': vineTemplateFormat,
    'format-vine-style-indent': vineStyleIndent,
    'format-vine-macros-leading': vineMacrosLeading,
    'format-vine-component-name': vineComponentNameFormat,
    'format-prefer-template': preferTemplate,
    'format-vine-expose-at-tail': vineExposeAtTail,
    'format-html-self-closing': formatHtmlSelfClosing,
  },
}

export {
  plugin as default,
  prettierSnapshot,
  VueVineESLintParser as vineParser,
}

export interface RuleOptions {
  'essentials-no-child-content': noChildContentOptions
  'essentials-no-dupe-else-if': noDupeElseIfOptions
  'essentials-no-dupe-attributes': noDupeAttributesOptions
  'format-vine-template': vineTemplateFormatOptions
  'format-vine-style-indent': vineStyleIndentOptions
  'format-vine-macros-leading': vineMacrosLeadingOptions
  'format-vine-component-name': vineComponentNameFormatOptions
  'format-prefer-template': preferTemplateOptions
  'format-vine-expose-at-tail': vineExposeAtTailOptions
  'format-html-self-closing': formatHtmlSelfClosingOptions
}

export type Rules = {
  [K in keyof RuleOptions]: Linter.RuleEntry<RuleOptions[K]>
}
