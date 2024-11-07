import type { ESLint, Linter } from 'eslint'
import * as VueVineESLintParser from '@vue-vine/eslint-parser'

import { version } from '../package.json'

import vineComponentNameNotHtmlBuiltin from './rules/vine-component-name-not-html-builtin'
import vineMacrosLeading from './rules/vine-macros-leading'
import vineStyleIndent from './rules/vine-style-indent'
import vineTemplateFormat from './rules/vine-template-format'

const plugin = {
  meta: {
    name: 'vue-vine',
    version,
  },
  rules: {
    'format-vine-template': vineTemplateFormat,
    'format-vine-style-indent': vineStyleIndent,
    'format-vine-macros-leading': vineMacrosLeading,
    'component-name-not-html-builtin': vineComponentNameNotHtmlBuiltin,
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
