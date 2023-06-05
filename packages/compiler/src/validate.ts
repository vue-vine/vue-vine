import type { SgNode } from '@ast-grep/napi'
import { ts } from '@ast-grep/napi'
import {
  ruleHasTemplateStringInterpolation,
  ruleInvalidDefineStyleWithDeclaration,
  ruleInvalidNoDeclVinePropCall,
  ruleInvalidOutsideMacroCalls,
  ruleInvalidRootScopeStmt,
  ruleValidVinePropDeclaration,
  ruleVineEmitsCall,
  ruleVineExposeCall,
  ruleVineOptionsCall,
  ruleVinePropCall,
  ruleVineStyleCall,
  ruleVineTaggedTemplateString,
} from './ast-grep-rules'
import type { VineCompilerHooks, VineFileCtx } from './types'
import { CALL_PUNCS, SUPPORTED_CSS_LANGS, VINE_PROP_WITH_DEFAULT_CALL, VUE_LIFECYCLE_HOOK_APIS, VUE_REACTIVITY_APIS } from './constants'
import { vineErr, vineWarn } from './diagnostics'

type ValidateCtx = [
  compilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
]

function assertOnlyOnce(
  [compilerHooks, vineFileCtx]: ValidateCtx,
  target: SgNode[],
  fnName: string,
) {
  if (target.length > 1) {
    const errMsg = `Multiple \`${fnName}\` calls are not allowed inside Vue Vine function component`
    compilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          range: target[1]!.range(),
        },
      ),
    )
    return false
  }
  return true
}
function assertCallExprHasOnlyOneObjLitArg(
  [compilerHooks, vineFileCtx]: ValidateCtx,
  callExprSgNode: SgNode | undefined,
  fnName: string,
) {
  if (!callExprSgNode) {
    throw new Error(`Panic on asserting \`${
      fnName
    }\` only one object literal argument: \`callExprSgNode\` is undefined.`)
  }
  const exposeCallArgs = callExprSgNode
    .field('arguments')!.children()
    .filter(node => !CALL_PUNCS.includes(node.kind()))
  const errMsg = `\`${fnName}\` can only have one object literal argument`
  if (exposeCallArgs.length > 1) {
    compilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          range: exposeCallArgs[1]!.range(),
        },
      ),
    )
    return false
  }
  const exposeCallArg = exposeCallArgs[0]!
  if (exposeCallArg.kind() !== 'object') {
    compilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          range: exposeCallArg.range(),
        },
      ),
    )
    return false
  }

  return true
}
function isValidVineStyleArg(argNode: SgNode) {
  if (argNode.kind() === 'string'
    || argNode.kind() === 'template_string'
  ) {
    return true
  }
  if (argNode.kind() === 'call_expression'
    || argNode.field('arguments')!.kind() === 'template_string'
  ) {
    return true
  }
  return false
}
function assertVineStyleArgStringAndLangType(
  [compilerHooks, vineFileCtx]: ValidateCtx,
  callExprSgNode: SgNode | undefined,
) {
  if (!callExprSgNode) {
    throw new Error('Panic on asserting `vineStyle` argument must be string: `callExprSgNode` is undefined.')
  }
  const vineStyleCallArgs = callExprSgNode
    .field('arguments')!
    .children()
    .filter(node => !CALL_PUNCS.includes(node.kind()))
  const errMsg = 'vineStyle can only have one string argument'
  if (vineStyleCallArgs.length > 1) {
    compilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          range: vineStyleCallArgs[1]!.range(),
        },
      ),
    )
    return false
  }
  const vineStyleCallArg = vineStyleCallArgs[0]!
  if (!isValidVineStyleArg(vineStyleCallArg)) {
    compilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          range: vineStyleCallArg.range(),
        },
      ),
    )
    return false
  }
  const hasTemplateStringInterpolation = vineStyleCallArg.findAll(ts.kind('template_substitution'))
  if (hasTemplateStringInterpolation.length > 0) {
    compilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: 'vineStyle argument must be a plain string, template string interpolation is not allowed',
          range: hasTemplateStringInterpolation[0]!.range(),
        },
      ),
    )
  }
  const isTaggedTemplateStringArg = vineStyleCallArg.kind() === 'call_expression'
  if (isTaggedTemplateStringArg && !SUPPORTED_CSS_LANGS.includes(vineStyleCallArg.field('function')!.text())) {
    compilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: 'vineStyle CSS language only supports: `css`, `scss`, `sass`, `less`, `stylus` and `postcss`',
          range: vineStyleCallArg.field('function')!.range(),
        },
      ),
    )
  }

  return true
}

// ---- Validate inside vine function component ----

/** Check vine tagged template string count, it can only be called once inside a vine function component */
function validateVineTemplateStringOnlyOnce(ctxs: ValidateCtx, vineFnNode: SgNode) {
  const vineTaggedTemplateStrings = vineFnNode.findAll(
    ruleVineTaggedTemplateString,
  )
  return assertOnlyOnce(
    ctxs,
    vineTaggedTemplateStrings,
    'Multiple vine tagged template strings are not allowed inside Vue Vine function component',
  )
}

/** Check macro call (not includes `vineProp`)
 *
 * - Check count, it can only be called once inside a vine function component
 * - Check `vineExpose`, `vineOptions` arguments, it can only be called with an object literal
 */
function validateNotPropMacroCallInsideComp(ctxs: ValidateCtx, vineFnNode: SgNode) {
  const vineStyleCalls = vineFnNode.findAll(ruleVineStyleCall)
  const vineExposeCalls = vineFnNode.findAll(ruleVineExposeCall)
  const vineOptionsCalls = vineFnNode.findAll(ruleVineOptionsCall)

  const asserts: boolean[] = []
  if (vineStyleCalls.length > 0) {
    asserts.push(
      assertOnlyOnce(
        ctxs,
        vineStyleCalls,
        'Multiple vineStyle calls are not allowed inside Vue Vine function component',
      ),
      assertVineStyleArgStringAndLangType(
        ctxs,
        vineStyleCalls[0],
      ),
    )
  }
  if (vineExposeCalls.length > 0) {
    asserts.push(
      assertOnlyOnce(ctxs, vineExposeCalls, 'vineExpose'),
      assertCallExprHasOnlyOneObjLitArg(ctxs, vineExposeCalls[0], 'vineExpose'),
    )
  }
  if (vineOptionsCalls.length > 0) {
    asserts.push(
      assertOnlyOnce(ctxs, vineOptionsCalls, 'vineOptions'),
      assertCallExprHasOnlyOneObjLitArg(ctxs, vineOptionsCalls[0], 'vineOptions'),
    )
  }

  return asserts.every(Boolean)
}

/** Check vine tagged template string, it can't contain any interpolation */
function validateVineTemplateStringNotContainsInterpolation(
  [compilerHooks, vineFileCtx]: ValidateCtx, vineFnNode: SgNode,
) {
  const vineTemplateSgNode = vineFnNode.find(ruleVineTaggedTemplateString)
  const inteplsInsideTemplate = vineTemplateSgNode!.findAll(ruleHasTemplateStringInterpolation)
  if (inteplsInsideTemplate.length > 0) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: inteplsInsideTemplate[0]!.range(),
        msg: 'Template string interpolation is not allowed inside Vue Vine template!',
      }),
    )
    return false
  }
  return true
}

/** Check vine function componet props type annotation must be object type literal */
function validateVineFunctionCompProps(
  [compilerHooks, vineFileCtx]: ValidateCtx,
  vineFnNode: SgNode,
) {
  const foundVinePropCalls = vineFnNode.findAll(ruleVinePropCall)
  // All `vineProp` call must inside a variable declaration
  const invalidNoDeclVinePropCalls = vineFnNode.findAll(ruleInvalidNoDeclVinePropCall)
  if (invalidNoDeclVinePropCalls.length > 0) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: invalidNoDeclVinePropCalls[0]!.range(),
        msg: 'vineProp must declare a variable as single prop!',
      }),
    )
    return false
  }

  const formalParams = vineFnNode.field('parameters')
  if (!formalParams || formalParams.text() === '()') {
    // ---- Not defined formal params, Checks for `vineProp` calls ----

    // Every vineProp call must have a type argument
    for (const vinePropCall of foundVinePropCalls) {
      const isWithDefault = vinePropCall.field('function')!.text().includes(VINE_PROP_WITH_DEFAULT_CALL)

      if (!isWithDefault && !vinePropCall.field('type_arguments')) {
        compilerHooks.onError(
          vineErr(vineFileCtx, {
            range: vinePropCall.range(),
            msg: 'vineProp call must have a type argument to specify the prop type!',
          }),
        )
        return false
      }

      if (isWithDefault) {
        const vinePropCallArgs = vinePropCall.field('arguments')!.children().filter(child => !CALL_PUNCS.includes(child.kind()))
        const defaultValueNode = vinePropCallArgs[0]
        if (
          defaultValueNode
          && (defaultValueNode.kind() === 'object'
          || defaultValueNode.kind() === 'array')
        ) {
          compilerHooks.onWarn(
            vineWarn(vineFileCtx, {
              range: defaultValueNode.range(),
              msg: 'Providing object/array type default value for vineProp should be wrapped with a function!',
            }),
          )
        }
      }
    }

    const allVinePropLexicalDecls = vineFnNode.findAll(ruleValidVinePropDeclaration)
    // all vineProp declaration must be `const`
    for (const vinePropLexicalDecl of allVinePropLexicalDecls) {
      const vinePropDeclarator = vinePropLexicalDecl.children().find(
        child => child.kind() === 'variable_declarator'
          && child.field('value')!.field('function')!.text().includes('vineProp'),
      )!
      if (vinePropLexicalDecl.field('kind')!.text() !== 'const') {
        compilerHooks.onError(
          vineErr(vineFileCtx, {
            range: vinePropDeclarator.range(),
            msg: 'vineProp declaration must be `const`!',
          }),
        )
        return false
      }
    }

    return true
  }

  // ---- Checks for formal params ----

  const paramsSgNodes = formalParams.children().slice(1, -1) // Skip parentheses
  if (paramsSgNodes.length > 1) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: paramsSgNodes[0]!.range(),
        msg: 'Vue Vine function component must have only one parameter!',
      }),
    )
    return false
  }

  const propsAsFirstParamSgNode = paramsSgNodes[0]!
  const firstParamPattern = propsAsFirstParamSgNode.field('pattern')
  const firstParamTypeAnnotation = propsAsFirstParamSgNode.field('type')
  if (!firstParamTypeAnnotation) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: propsAsFirstParamSgNode.range(),
        msg: 'Vue Vine function component props must have type annotation!',
      }),
    )
    return false
  }
  if (firstParamPattern?.kind() === 'object_pattern') {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: firstParamPattern.range(),
        msg: 'Vue Vine function component props can\'t be destructured on formal parameter!',
      }),
    )
    return false
  }
  if (!firstParamTypeAnnotation?.children().find(child => child.kind() === 'object_type')) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: firstParamTypeAnnotation?.range(),
        msg: 'Vue Vine function component props type must be object literal!',
      }),
    )
    return false
  }

  // Now the vine function component has a explicit props,
  // then it's not allowed to call `vineProp` inside
  if (foundVinePropCalls.length > 0) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: foundVinePropCalls[0]!.range(),
        msg: 'It\'s not allowed to call vineProp when Vue Vine function component has a explicit props!',
      }),
    )
    return false
  }

  return true
}

/** Check vine function component's vineEmits, must have type definition */
function validateVineFunctionDefineEmits(
  [compilerHooks, vineFileCtx]: ValidateCtx, vineFnNode: SgNode,
) {
  const tryFindVineEmits = vineFnNode.findAll(ruleVineEmitsCall)
  if (tryFindVineEmits.length === 0) {
    // No vineEmits, skip this check
    return true
  }
  else if (tryFindVineEmits.length > 1) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: tryFindVineEmits[1]!.range(),
        msg: 'Vue Vine function component can only have one vineEmits!',
      }),
    )
    return false
  }

  const vineEmitsSgNode = tryFindVineEmits[0]!
  const typeArgsSgNode = vineEmitsSgNode.field('type_arguments')
  const maybeObjType = typeArgsSgNode?.child(0)
  if (!typeArgsSgNode || !maybeObjType) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: vineEmitsSgNode.range(),
        msg: 'Vue Vine function component\'s vineEmits must have type definition!',
      }),
    )
    return false
  }
  if (maybeObjType.kind() !== 'object_type') {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: maybeObjType.range(),
        msg: 'Vue Vine function component\'s vineEmits type must be object literal!',
      }),
    )
    return false
  }
  return true
}

// ---- Validate in root scope ----

/** Check if there is any outside macro calls */
function validateNoOutsideMacroCalls([compilerHooks, vineFileCtx]: ValidateCtx, sgRoot: SgNode) {
  const outsideMacroCalls = sgRoot.findAll(ruleInvalidOutsideMacroCalls)
  if (outsideMacroCalls.length > 0) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: outsideMacroCalls[0]!.range(),
        msg: 'Vine macro calls must be inside Vue Vine function component!',
      }),
    )
  }

  return true
}

function validateDefineStyleIsNotLexicalDeclaration([compilerHooks, vineFileCtx]: ValidateCtx, sgRoot: SgNode) {
  const invalidDefStyle = sgRoot.findAll(
    ruleInvalidDefineStyleWithDeclaration,
  )
  if (invalidDefStyle.length === 0) {
    return true
  }
  compilerHooks.onError(
    vineErr(vineFileCtx, {
      range: invalidDefStyle[0]!.range(),
      msg: 'vineStyle call must not be a lexical declaration!',
    }),
  )
  return false
}

const needCheckingKindsInRootScope = [
  'expression_statement',
  'lexical_declaration',
  'export_statement',
]
function isForbiddenVueApiInRootScope(fnName: string) {
  return VUE_REACTIVITY_APIS.includes(fnName)
    || VUE_LIFECYCLE_HOOK_APIS.includes(fnName)
}

function validateNoVueApiCallForCallExpr(
  [compilerHooks, vineFileCtx]: ValidateCtx,
  callExpr: SgNode,
) {
  const callFnName = callExpr.field('function')!.text()
  if (isForbiddenVueApiInRootScope(callFnName)) {
    compilerHooks.onError(
      vineErr(vineFileCtx, {
        range: callExpr.range(),
        msg: `Vue reactivity API ${callFnName} is not allowed in root top level scope!`,
      }),
    )
    return false
  }
  return true
}

/** It's not allowed to call any Vue reactivity API in root top level scope.
 * But it's hard and not performant to use a big list of method names regexp in ast-grep
 *
 * So we dive into each direct child statement node, and process by its kind.
 *
 * Since only the following 2 kinds of statement node can contain Vue reactivity API:
 *  - `'expression_statement'`
 *  - `'lexical_declaration'`, maybe under `'export_statement'`
 */
function validateRootScopeStatementsNoVueApiCall(
  validateCtx: ValidateCtx,
  sgRoot: SgNode,
) {
  const allDirectChildStatements = sgRoot
    .children()
    .filter(node => needCheckingKindsInRootScope.includes(node.kind()))
  for (const stmtNode of allDirectChildStatements) {
    if (stmtNode.kind() === 'export_statement') {
      const lexDecl = stmtNode.children().find(node => node.kind() === 'lexical_declaration')
      if (!lexDecl) {
        continue
      }
      const declValue = lexDecl.child(1)!.field('value')!
      if (declValue.kind() !== 'call_expression') {
        continue
      }
      const noVueApiCallForLexDecl = validateNoVueApiCallForCallExpr(validateCtx, declValue)
      if (!noVueApiCallForLexDecl) {
        return false
      }
    }
    else if (stmtNode.kind() === 'lexical_declaration') {
      const declValue = stmtNode.child(1)!.field('value')!
      if (declValue.kind() !== 'call_expression') {
        continue
      }
      const noVueApiCallForLexDecl = validateNoVueApiCallForCallExpr(validateCtx, declValue)
      if (!noVueApiCallForLexDecl) {
        return false
      }
    }
    else if (stmtNode.kind() === 'expression_statement') {
      const expr = stmtNode.child(0)!
      if (expr.kind() !== 'call_expression') {
        continue
      }
      const noVueApiCallForCallExpr = validateNoVueApiCallForCallExpr(validateCtx, expr)
      if (!noVueApiCallForCallExpr) {
        return false
      }
    }
  }
  return true
}

function validateNoInvalidRootScopeStmt(
  validateCtx: ValidateCtx,
  sgRoot: SgNode,
) {
  const [compilerHooks] = validateCtx
  const allInvlidRootScopeStmts = sgRoot.findAll(ruleInvalidRootScopeStmt)
  if (allInvlidRootScopeStmts.length > 0) {
    const invalidStmt = allInvlidRootScopeStmts[0]!
    compilerHooks.onError(
      vineErr(validateCtx[1]!, {
        range: invalidStmt.range(),
        msg: `Invalid statement (kind: ${invalidStmt.kind()}) in root top level scope!`,
      }),
    )
  }
  return true
}

const validatesFromRoot = [
  validateDefineStyleIsNotLexicalDeclaration,
  validateNoOutsideMacroCalls,
  validateRootScopeStatementsNoVueApiCall,
  validateNoInvalidRootScopeStmt,
] as const
const validatesFromVineFn = [
  validateVineTemplateStringOnlyOnce,
  validateNotPropMacroCallInsideComp,
  validateVineTemplateStringNotContainsInterpolation,
  validateVineFunctionCompProps,
  validateVineFunctionDefineEmits,
] as const

export function validateVine(
  compilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
  allVineFnCompDecls: SgNode[],
) {
  const hasValidateError = (
    validates: typeof validatesFromRoot | typeof validatesFromVineFn,
    fromNode: SgNode,
  ) => {
    return validates.map(
      validateFn => validateFn([compilerHooks, vineFileCtx], fromNode),
    ).filter(Boolean).length < validates.length
  }

  const { sgRoot } = vineFileCtx
  // Validate all restrictions for root
  if (hasValidateError(validatesFromRoot, sgRoot)) {
    return
  }

  for (const vineFn of allVineFnCompDecls) {
    // Validate all restrictions for vine function component
    if (hasValidateError(validatesFromVineFn, vineFn)) {
      return
    }
  }
}
