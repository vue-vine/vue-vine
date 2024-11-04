import type { ESLint, Linter } from 'eslint'
import { version } from '../package.json'

import vineMacrosLeading from './rules/vine-macros-leading'
import vineStyleIndent from './rules/vine-style-indent'

const plugin = {
  meta: {
    name: 'vue-vine',
    version,
  },
  rules: {
    'format-vine-style-indent': vineStyleIndent,
    'format-vine-macros-leading': vineMacrosLeading,
  },
} satisfies ESLint.Plugin

export default plugin

type RuleDefinitions = typeof plugin['rules']

export type RuleOptions = {
  [K in keyof RuleDefinitions]: RuleDefinitions[K]['defaultOptions']
}

export type Rules = {
  [K in keyof RuleOptions]: Linter.RuleEntry<RuleOptions[K]>
}
