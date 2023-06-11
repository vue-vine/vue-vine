import type { NapiConfig } from '@ast-grep/napi'

export function selectUtilRules<U extends Record<string, any>>(ruleUtilsObj: U, utils: (keyof U)[]) {
  return Object.fromEntries(
    Object.entries(ruleUtilsObj)
      .filter(
        ([name]) => utils.includes(name as keyof U),
      ),
  ) as Partial<U>
}

export function fastCreateMatchRuleByUtils<U extends Record<string, any>>(
  ruleUtilsObj: U,
  utilName: keyof U,
  utilsSpec?: Partial<U>,
  extraRules?: any,
  reverse = false,
): NapiConfig {
  const rule = {
    matches: utilName,
    ...extraRules,
  }
  return {
    rule: reverse ? { not: rule } : rule,
    utils: utilsSpec ?? ruleUtilsObj,
  }
}

export function directlyMatchUtil<U extends Record<string, any>>(ruleUtilsObj: U, utilName: keyof U): NapiConfig {
  return fastCreateMatchRuleByUtils(
    ruleUtilsObj,
    utilName,
    selectUtilRules(ruleUtilsObj, [utilName]),
  )
}

export function directlyReverseUtil<U extends Record<string, any>>(ruleUtilsObj: U, utilName: keyof U): NapiConfig {
  return fastCreateMatchRuleByUtils(
    ruleUtilsObj,
    utilName,
    selectUtilRules(ruleUtilsObj, [utilName]),
    undefined,
    true,
  )
}
