import type { NapiConfig } from '@ast-grep/napi'
import { directlyMatchUtil, directlyReverseUtil, fastCreateMatchRuleByUtils } from './shared'

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

export const vineScriptRuleUtils = {
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
  // TODO 优化规则
  destructuredAlias: {
    any: [
      {
        kind: 'shorthand_property_identifier_pattern',
      },
      {
        kind: 'identifier',
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
  topLevelDeclarationNames: {
    any: [
      {
        kind: 'identifier',
        inside: {
          kind: 'variable_declarator',
          inside: {
            any: [
              {
                kind: 'lexical_declaration',
              },
              {
                kind: 'variable_declaration',
              },
            ],
            inside: {
              kind: 'program',
            },
          },
        },
      },
      {
        kind: 'identifier',
        inside: {
          kind: 'function_declaration',
          inside: {
            kind: 'program',
          },
        },
      },
      {
        kind: 'type_identifier',
        inside: {
          any: [
            {
              kind: 'class_declaration',
            },
            {
              kind: 'abstract_class_declaration',
            },
          ],
          inside: {
            kind: 'program',
          },
        },
      },
    ],
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

export const ruleVineFunctionComponentDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vineFunctionComponentDeclaration')
export const ruleVineFunctionComponentMatching = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vineFunctionComponentMatching')
export const ruleVineFormalParmasProps = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vineFormalParmasProps')
export const ruleVineEmitsCall = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'validVineEmitsCall')
export const ruleVineEmitsDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vineEmitsDeclaration')
export const ruleValidVinePropDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'validVinePropDeclaration')
export const ruleVinePropValidatorFnBody = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vinePropValidatorFnBody')
export const ruleInvalidNoDeclVinePropCall = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'invalidNoDeclVinePropCall')
export const ruleInvalidDefineStyleWithDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'invalidDeclOfVineStyleCall')
export const ruleInvalidRootScopeStmt = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'invalidRootScopeStmt')
export const ruleIdInsideMacroMayReferenceSetupLocal = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'idInsideMacroMayReferenceSetupLocal')
export const ruleHasMacroCallExpr = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'hasMacroCallExpr')
export const ruleHasVueRefCallExpr = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'hasVueRefCallExpr')
export const ruleTopLevelDeclarationNames = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'topLevelDeclarationNames')
export const ruleSetupVariableDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'setupVariableDeclaration')
export const ruleDestructuredAlias = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'destructuredAlias')
export const ruleVineTaggedTemplateString = directlyMatchUtil(vineScriptRuleUtils, 'vineTaggedTemplateString')
export const ruleImportStmt = directlyMatchUtil(vineScriptRuleUtils, 'importStmt')
export const ruleImportClause = directlyMatchUtil(vineScriptRuleUtils, 'importClause')
export const ruleImportSpecifier = directlyMatchUtil(vineScriptRuleUtils, 'importSpecifier')
export const ruleNotImportSpecifier = directlyReverseUtil(vineScriptRuleUtils, 'importSpecifier')
export const ruleImportNamespace = directlyMatchUtil(vineScriptRuleUtils, 'importNamespace')
export const ruleVineStyleCall = directlyMatchUtil(vineScriptRuleUtils, 'vineStyleCall')
export const ruleVinePropCall = directlyMatchUtil(vineScriptRuleUtils, 'vinePropCall')
export const ruleVineExposeCall = directlyMatchUtil(vineScriptRuleUtils, 'vineExposeCall')
export const ruleVineOptionsCall = directlyMatchUtil(vineScriptRuleUtils, 'vineOptionsCall')

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
