import type { NapiConfig } from '@ast-grep/napi'

function macroCallPattern(macroName: string) {
  return {
    kind: 'call_expression',
    has: {
      field: 'function',
      regex: macroName,
    },
  } as const
}
function validMacroCallPattern(macroCallRuleUtilName: string) {
  return {
    matches: macroCallRuleUtilName,
    inside: {
      stopBy: 'end',
      matches: 'vineFunctionComponentMatching',
    },
  } as const
}
function invalidMacroCallNotInsideVineFunctionComponent(
  macroCallRuleUtilName: string,
) {
  return {
    matches: macroCallRuleUtilName,
    not: {
      inside: {
        stopBy: 'end',
        matches: 'vineFunctionComponentMatching',
      },
    },
  } as const
}

const topLevelStmtKinds = [
  'import_statement',
  'export_statement',
  'function_declaration',
  'class_declaration',
  'abstract_class_declaration',
  'enum_declaration',
  'lexical_declaration',
  'type_alias_declaration',
  'interface_declaration',
  'comment',
] as const

export const vineAstGrepUtils = {
  importClause: {
    kind: 'import_clause',
  },
  importSpecifier: {
    kind: 'import_specifier',
  },
  importNamespace: {
    kind: 'namespace_import',
  },
  importStmt: {
    kind: 'import_statement',
  },
  vinePropCall: macroCallPattern('vineProp'),
  vineStyleCall: macroCallPattern('vineStyle'),
  vineExposeCall: macroCallPattern('vineExpose'),
  vineEmitsCall: macroCallPattern('vineEmits'),
  vineOptionsCall: macroCallPattern('vineOptions'),
  validVineEmitsCall: validMacroCallPattern('vineEmitsCall'),
  validVineOptionsCall: validMacroCallPattern('vineOptionsCall'),
  idInsideMacroMayReferenceSetupLocal: {
    kind: 'identifier',
    inside: {
      stopBy: 'end',
      any: [
        { matches: 'validVineEmitsCall' },
        { matches: 'validVineOptionsCall' },
      ],
    },
  },
  validVinePropDeclaration: {
    kind: 'lexical_declaration',
    has: {
      stopBy: 'end',
      matches: 'vinePropCall',
    },
    inside: {
      stopBy: 'end',
      matches: 'vineFunctionComponentMatching',
    },
  },
  vinePropValidatorFnBody: {
    kind: 'statement_block',
    inside: {
      stopBy: 'end',
      matches: 'vinePropCall',
    },
  },
  vinePropsTyping: {
    kind: 'object_type',
    inside: {
      stopBy: 'end',
      matches: 'vineFormalParmasProps',
    },
  },
  vineFormalParmasProps: {
    kind: 'formal_parameters',
    inside: {
      stopBy: {
        kind: 'statement_block',
      },
      matches: 'vineFunctionComponentMatching',
    },
  },
  vineEmitsDeclaration: {
    kind: 'variable_declarator',
    has: {
      stopBy: 'end',
      matches: 'vineEmitsCall',
    },
  },
  setupVariableDeclaration: {
    any: [
      {
        kind: 'variable_declarator',
      },
      {
        kind: 'pair_pattern',
      },
    ],
  },
  vineTaggedTemplateString: {
    kind: 'call_expression',
    all: [
      {
        has: {
          kind: 'template_string',
          field: 'arguments',
        },
      },
      {
        has: {
          field: 'function',
          regex: 'vine',
        },
      },
    ],
  },
  functionDeclaration: {
    any: [
      {
        kind: 'function_declaration',
      },
      {
        kind: 'lexical_declaration',
        has: {
          stopBy: 'end',
          kind: 'arrow_function',
        },
      },
    ],
  },
  vineNormalFunctionDeclaration: {
    kind: 'function_declaration',
    has: {
      field: 'body',
      has: {
        stopBy: 'end',
        matches: 'vineTaggedTemplateString',
      },
    },
  },
  vineVariableFunctionDeclaration: {
    kind: 'lexical_declaration',
    has: {
      stopBy: 'end',
      any: [
        {
          kind: 'arrow_function',
          has: {
            stopBy: 'end',
            matches: 'vineTaggedTemplateString',
          },
        },
        {
          kind: 'function',
          has: {
            stopBy: 'end',
            matches: 'vineTaggedTemplateString',
          },
        },
      ],
    },
  },
  vineFunctionComponentMatching: {
    any: [
      {
        matches: 'vineNormalFunctionDeclaration',
      },
      {
        matches: 'vineVariableFunctionDeclaration',
      },
    ],
  },
  vineFunctionComponentDeclaration: {
    any: [
      {
        // No export
        matches: 'vineFunctionComponentMatching',
        not: {
          inside: {
            kind: 'export_statement',
          },
        },
      },
      {
        kind: 'export_statement',
        has: {
          field: 'declaration',
          matches: 'vineFunctionComponentMatching',
        },
      },
    ],
  },
  hasMacroCallExpr: {
    has: {
      stopBy: 'end',
      kind: 'call_expression',
      any: [
        {
          regex: 'vineProp',
        },
        {
          regex: 'vineEmits',
        },
        {
          regex: 'vineStyle',
        },
        {
          regex: 'vineExpose',
        },
        {
          regex: 'vineOptions',
        },
      ],
    },
  },
  hasVueRefCallExpr: {
    has: {
      stopBy: 'end',
      kind: 'call_expression',
      regex: 'ref',
    },
  },

  // Rules for find invalid.
  invalidOutsideVineStyleCall: invalidMacroCallNotInsideVineFunctionComponent('vineStyleCall'),
  invalidOutsideVineExposeCall: invalidMacroCallNotInsideVineFunctionComponent('vineExposeCall'),
  invalidOutsideVinePropCall: invalidMacroCallNotInsideVineFunctionComponent('vinePropCall'),
  invalidOutsideVineEmitsCall: invalidMacroCallNotInsideVineFunctionComponent('vineEmitsCall'),
  invalidOutsideVineOptionsCall: invalidMacroCallNotInsideVineFunctionComponent('vineOptionsCall'),
  invalidNoDeclVinePropCall: {
    matches: 'vinePropCall',
    not: {
      inside: {
        stopBy: 'end',
        kind: 'lexical_declaration',
        inside: {
          stopBy: 'end',
          matches: 'vineFunctionComponentMatching',
        },
      },
    },
  },
  invalidDeclOfVineStyleCall: {
    kind: 'lexical_declaration',
    has: {
      stopBy: 'end',
      pattern: 'vineStyle',
    },
    inside: {
      stopBy: 'end',
      matches: 'vineFunctionComponentMatching',
    },
  },
  invalidRootScopeStmt: {
    pattern: '$STMT',
    inside: {
      kind: 'program',
    },
    not: {
      any: [
        {
          matches: 'vineFunctionComponentDeclaration',
        },
        ...topLevelStmtKinds.map(kind => ({
          kind,
        })),
      ],
    },
  },
} as const
type VineAstGrepUtils = typeof vineAstGrepUtils
type VineAstGrepUtilsName = keyof VineAstGrepUtils

function selectUtilRules(utils: VineAstGrepUtilsName[]) {
  return Object.fromEntries(
    Object.entries(vineAstGrepUtils)
      .filter(
        ([name]) => utils.includes(name as VineAstGrepUtilsName),
      ),
  )
}

function fastCreateMatchRuleByUtils(
  utilName: VineAstGrepUtilsName,
  utilsSpec?: Partial<VineAstGrepUtils>,
  extraRules?: any,
  reverse = false,
): NapiConfig {
  const rule = {
    matches: utilName,
    ...extraRules,
  }
  return {
    rule: reverse ? { not: rule } : rule,
    utils: utilsSpec ?? vineAstGrepUtils,
  }
}

function directlyMatchUtil(utilName: VineAstGrepUtilsName): NapiConfig {
  return fastCreateMatchRuleByUtils(
    utilName,
    selectUtilRules([utilName]),
  )
}
function directlyReverseUtil(utilName: VineAstGrepUtilsName): NapiConfig {
  return fastCreateMatchRuleByUtils(
    utilName,
    selectUtilRules([utilName]),
    undefined,
    true,
  )
}

export const ruleVineFunctionComponentDeclaration = fastCreateMatchRuleByUtils('vineFunctionComponentDeclaration')
export const ruleVineFunctionComponentMatching = fastCreateMatchRuleByUtils('vineFunctionComponentMatching')
export const ruleVineFormalParmasProps = fastCreateMatchRuleByUtils('vineFormalParmasProps')
export const ruleVineEmitsCall = fastCreateMatchRuleByUtils('validVineEmitsCall')
export const ruleVineEmitsDeclaration = fastCreateMatchRuleByUtils('vineEmitsDeclaration')
export const ruleValidVinePropDeclaration = fastCreateMatchRuleByUtils('validVinePropDeclaration')
export const ruleVinePropValidatorFnBody = fastCreateMatchRuleByUtils('vinePropValidatorFnBody')
export const ruleInvalidNoDeclVinePropCall = fastCreateMatchRuleByUtils('invalidNoDeclVinePropCall')
export const ruleInvalidDefineStyleWithDeclaration = fastCreateMatchRuleByUtils('invalidDeclOfVineStyleCall')
export const ruleInvalidRootScopeStmt = fastCreateMatchRuleByUtils('invalidRootScopeStmt')
export const ruleIdInsideMacroMayReferenceSetupLocal = fastCreateMatchRuleByUtils('idInsideMacroMayReferenceSetupLocal')
export const ruleHasMacroCallExpr = fastCreateMatchRuleByUtils('hasMacroCallExpr')
export const ruleHasVueRefCallExpr = fastCreateMatchRuleByUtils('hasVueRefCallExpr')
export const ruleSetupVariableDeclaration = fastCreateMatchRuleByUtils('setupVariableDeclaration')
export const ruleVineTaggedTemplateString = directlyMatchUtil('vineTaggedTemplateString')
export const ruleImportStmt = directlyMatchUtil('importStmt')
export const ruleImportClause = directlyMatchUtil('importClause')
export const ruleImportSpecifier = directlyMatchUtil('importSpecifier')
export const ruleNotImportSpecifier = directlyReverseUtil('importSpecifier')
export const ruleImportNamespace = directlyMatchUtil('importNamespace')
export const ruleVineStyleCall = directlyMatchUtil('vineStyleCall')
export const ruleVinePropCall = directlyMatchUtil('vinePropCall')
export const ruleVineExposeCall = directlyMatchUtil('vineExposeCall')
export const ruleVineOptionsCall = directlyMatchUtil('vineOptionsCall')

export const ruleHasTemplateStringInterpolation: NapiConfig = {
  rule: {
    has: {
      kind: 'template_substitution',
    },
  },
}
export const ruleInvalidOutsideMacroCalls: NapiConfig = {
  rule: {
    any: [
      { matches: 'invalidOutsideVinePropCall' },
      { matches: 'invalidOutsideVineStyleCall' },
      { matches: 'invalidOutsideVineExposeCall' },
      { matches: 'invalidOutsideVineEmitsCall' },
      { matches: 'invalidOutsideVineOptionsCall' },
    ],
  },
}
