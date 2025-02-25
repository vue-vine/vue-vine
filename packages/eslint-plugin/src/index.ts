import type { ESLint, Linter } from 'eslint'
import * as VueVineESLintParser from '@vue-vine/eslint-parser'

import { version } from '../package.json'

// Essentials:
import noChildContent from './rules/essentials/no-child-content'
import noDupeAttributes from './rules/essentials/no-dupe-attributes'
import noDupeElseIf from './rules/essentials/no-dupe-else-if'

// Formats:
import preferTemplate from './rules/format/format-prefer-template'
import vineComponentNameFormat from './rules/format/format-vine-component-name'
import vineExposeAtTail from './rules/format/format-vine-expose-at-tail'
import vineMacrosLeading from './rules/format/format-vine-macros-leading'
import vineStyleIndent from './rules/format/format-vine-style-indent'
import vineTemplateFormat from './rules/format/format-vine-template'

const plugin = {
  meta: {
    name: 'vue-vine',
    version,
  },
  rules: {
    'essentials-no-child-content': noChildContent,
    'essentials-no-dupe-else-if': noDupeElseIf,
    'essentials-no-dupe-attributes': noDupeAttributes,

    'format-vine-template': vineTemplateFormat,
    'format-vine-style-indent': vineStyleIndent,
    'format-vine-macros-leading': vineMacrosLeading,
    'format-vine-component-name': vineComponentNameFormat,
    'format-prefer-template': preferTemplate,
    'format-vine-expose-at-tail': vineExposeAtTail,
  },
} satisfies ESLint.Plugin

export {
  plugin as default,
  VueVineESLintParser as vineParser,
}

type RuleDefinitions = typeof plugin['rules']

export type RuleOptions = {
  [K in keyof RuleDefinitions]: RuleDefinitions[K]['defaultOptions']
}

export type Rules = {
  [K in keyof RuleOptions]: Linter.RuleEntry<RuleOptions[K]>
}
