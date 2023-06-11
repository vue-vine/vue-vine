import type { NapiConfig } from '@ast-grep/napi'
import { fastCreateMatchRuleByUtils, selectUtilRules } from './shared'

export const vineTemplateRuleUtils = {
  directive_attr: {
    kind: 'attribute',
    has: {
      kind: 'attribute_name',
      regex: 'v-[\\w\\-]+',
    },
  },
  v_bind_attr: {
    kind: 'attribute',
    has: {
      kind: 'attribute_name',
      any: [
        {
          regex: ':[\\w\\-\\[]',
        },
        {
          regex: 'v-bind:[\\w\\-\\[]',
        },
      ],
    },
  },
  v_on_attr: {
    kind: 'attribute',
    has: {
      kind: 'attribute_name',
      any: [
        {
          regex: '\\@[\\w\\-\\[]',
        },
        {
          regex: 'v-on:[\\w\\-\\[]',
        },
      ],
    },
  },
  interpolation: {
    kind: 'text',
    regex: '\\{\\{(.*)\\}\\}',
  },
} as const

export const templateScriptAttrsRule: NapiConfig = {
  rule: {
    any: [
      { matches: 'v_bind_attr' },
      { matches: 'v_on_attr' },
      { matches: 'directive_attr' },
    ],
  },
  utils: selectUtilRules(
    vineTemplateRuleUtils,
    [
      'directive_attr',
      'v_bind_attr',
      'v_on_attr',
    ],
  ),
}

export const templateInterplationRule: NapiConfig = fastCreateMatchRuleByUtils(
  vineTemplateRuleUtils,
  'interpolation',
)
