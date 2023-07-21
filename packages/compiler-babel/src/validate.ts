import {
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
  isTSPropertySignature,
  isTSTypeAnnotation,
  isTSTypeLiteral,
  isTaggedTemplateExpression,
  isTemplateLiteral,
  isVariableDeclaration,
  traverse,
} from '@babel/types'
import type {
  CallExpression,
  Identifier,
  Node,
} from '@babel/types'
import type { VineBabelRoot, VineCompilerHooks, VineFileCtx } from './types'
import {
  getFunctionParams,
  getVineMacroCalleeName,
  isDescendant,
  isTagTemplateStringContainsInterpolation,
  isValidVineRootScopeStatement,
  isVineMacroCallExpression,
  isVineMacroOf,
  isVineTaggedTemplateString,
  isVueReactivityApiCallExpression,
} from './babel-ast'
import { vineErr } from './diagnostics'
import type { CountingMacros } from './constants'
import { SUPPORTED_CSS_LANGS } from './constants'
import { colorful } from './utils/color-string'

interface VineValidatorCtx {
  vineCompilerHooks: VineCompilerHooks
  vineFileCtx: VineFileCtx
  vineCompFns: Node[]
}

type VineValidator = (
  context: VineValidatorCtx,
  fromNode: Node,
) => boolean

function wrapVineValidatorWithLog(validators: VineValidator[]) {
  return process.env.VINE_DEV_VITEST === 'true'
    ? validators.map(validator => (...args: Parameters<VineValidator>) => {
      const isPass = validator(...args)
      console.log(`${
          colorful(' VINE VALIDATE ', ['bgGreen', 'white'])
        } ${validator.name} => ${
          colorful(isPass ? 'PASS' : 'FAIL', [isPass ? 'green' : 'red'])
        }`)
      return isPass
    })
    : validators
}

function logMacroAssert(macroName: string, isPass: boolean) {
  if (process.env.VINE_DEV_VITEST !== 'true') {
    return
  }
  console.log(`${
    colorful(' VINE MACRO ASSERT ', ['bgMagenta', 'white'])
  } ${macroName} => ${
    colorful(isPass ? 'PASS' : 'FAIL', [isPass ? 'green' : 'red'])
  }`)
}

/**
 * Vine macro calls must be inside a valid Vine component function
 */
function validateNoOutsideMacroCalls(
  { vineCompilerHooks, vineFileCtx, vineCompFns }: VineValidatorCtx,
  root: Node,
) {
  let isMacroInsideVineCompFn = true
  traverse(root, (node) => {
    if (!isVineMacroCallExpression(node)) {
      return
    }
    isMacroInsideVineCompFn = vineCompFns.some(
      vineCompFn => isDescendant(vineCompFn, node),
    )
    if (!isMacroInsideVineCompFn) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Vine macro calls must be inside Vue Vine component function!',
            location: node.loc,
          },
        ),
      )
    }
  })
  return isMacroInsideVineCompFn
}

/**
 * Restrict root scope statement types
 * for not making any side effects
 */
function validateNoInvalidTypesRootScopeStmt(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  root: Node,
) {
  for (const stmt of (root as VineBabelRoot).program.body) {
    if (isVariableDeclaration(stmt)) {
      let hasVueReactivityApiCallInRootVarDeclaration = false
      traverse(stmt, (node) => {
        if (isVueReactivityApiCallExpression(node)) {
          vineCompilerHooks.onError(
            vineErr(
              vineFileCtx,
              {
                msg: 'Vue API calls are not allowed to be called in Vine root scope!',
                location: node.loc,
              },
            ),
          )
          hasVueReactivityApiCallInRootVarDeclaration = true
        }
      })
      if (hasVueReactivityApiCallInRootVarDeclaration) {
        return false
      }
    }
    else if (!isValidVineRootScopeStatement(stmt)) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Invalid root scope statements must be inside Vue Vine component function!',
            location: stmt.loc,
          },
        ),
      )
      return false
    }
  }
  return true
}

/** Check vine tagged template string usage,
 * it can only be called once inside a vine component function,
 * and it can't contain any interpolation
 */
function validateVineTemplateStringUsage(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  vineCompFn: Node,
) {
  let isVineTemplateUsagePass = true
  let vineTemplateStrCount = 0
  traverse(vineCompFn, (node) => {
    if (!isVineTaggedTemplateString(node)) {
      return
    }
    vineTemplateStrCount += 1
    if (vineTemplateStrCount > 1) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Multiple vine tagged template are not allowed inside Vine component function',
            location: node.loc,
          },
        ),
      )
      isVineTemplateUsagePass = false
    }
    if (isTagTemplateStringContainsInterpolation(node)) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Vine template string are not allowed to contain interpolation !',
            location: node.loc,
          },
        ),
      )
      isVineTemplateUsagePass = false
    }
  })
  return isVineTemplateUsagePass
}

function assertVineStyleUsage(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  vineStyleMacroCallNode: CallExpression,
) {
  const vineStyleArgsLength = vineStyleMacroCallNode.arguments.length
  const macroCallee = vineStyleMacroCallNode.callee as Identifier
  if (vineStyleArgsLength === 1) {
    const theOnlyArg = vineStyleMacroCallNode.arguments[0]
    if (isStringLiteral(theOnlyArg)) {
      // Pass, simple string literal is allowed.
    }
    else if (isTemplateLiteral(theOnlyArg)) {
      if (theOnlyArg.expressions.length > 0) {
        vineCompilerHooks.onError(
          vineErr(
            vineFileCtx,
            {
              msg: 'vineStyle argument must be a plain string, template string interpolation is not allowed',
              location: theOnlyArg.loc,
            },
          ),
        )
        return false
      }
    }
    else if (isTaggedTemplateExpression(theOnlyArg)) {
      if (
        theOnlyArg.tag
        && isIdentifier(theOnlyArg.tag)
        && !(SUPPORTED_CSS_LANGS as any).includes(theOnlyArg.tag.name)
      ) {
        vineCompilerHooks.onError(
          vineErr(
            vineFileCtx,
            {
              msg: 'vineStyle CSS language only supports: `css`, `scss`, `sass`, `less`, `stylus` and `postcss`',
              location: theOnlyArg.tag.loc,
            },
          ),
        )
        return false
      }
    }
    else {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'vineStyle\'s argument can only be string',
            location: theOnlyArg.loc,
          },
        ),
      )
      return false
    }
  }
  else if (vineStyleArgsLength > 1) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: `\`vineStyle\` ${
            vineStyleArgsLength > 1
              ? 'can only'
              : 'must'
          } have one string argument'`,
          location: macroCallee.loc,
        },
      ),
    )
    return false
  }

  return true
}

function assertCanOnlyHaveOneObjLiteralArg(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  macroCallNode: CallExpression,
) {
  const macroCallArgsLength = macroCallNode.arguments.length
  const macroCallee = macroCallNode.callee as Identifier
  const errMsg = `\`${macroCallee.name}\` ${
    macroCallArgsLength > 1 ? 'can only' : 'must'
  } have one object literal argument`
  if (macroCallArgsLength === 1) {
    const theOnlyArg = macroCallNode.arguments[0]
    if (!isObjectExpression(theOnlyArg)) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: errMsg,
            location: theOnlyArg.loc,
          },
        ),
      )
      return false
    }
  }
  else {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          location: macroCallee.loc,
        },
      ),
    )
    return false
  }

  return true
}

function assertFnCallHasOnlyOneTypeParameter(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  macroCallNode: CallExpression,
) {
  const macroCallee = macroCallNode.callee as Identifier
  const typeParams = macroCallNode.typeParameters?.params
  const typeParamsLength = typeParams?.length
  const errMsg = `\`${macroCallee.name}\` ${
    (typeParamsLength && typeParamsLength > 1) ? 'can only' : 'must'
  } have one `
  if (typeParamsLength === 1) {
    const theOnlyTypeParam = typeParams?.[0]
    if (!isTSTypeLiteral(theOnlyTypeParam)) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Vue Vine component function\'s vineEmits type must be object literal!',
            location: theOnlyTypeParam?.loc,
          },
        ),
      )
      return false
    }
  }
  else {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          location: macroCallee.loc,
        },
      ),
    )
    return false
  }

  return true
}

function validateMacrosUsage(
  validatorCtx: VineValidatorCtx,
  vineCompFn: Node,
) {
  type MacroAssert = (
    context: VineValidatorCtx,
    macroCallNode: CallExpression
  ) => boolean
  interface MacroDescriptor {
    count: number
    asserts: MacroAssert[]
    node?: CallExpression
  }
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  const macroCountMap: Record<CountingMacros, MacroDescriptor> = {
    vineStyle: {
      count: 0,
      asserts: [
        assertVineStyleUsage,
      ],
    },
    vineEmits: {
      count: 0,
      asserts: [
        assertFnCallHasOnlyOneTypeParameter,
      ],
    },
    vineExpose: {
      count: 0,
      asserts: [
        assertCanOnlyHaveOneObjLiteralArg,
      ],
    },
    vineOptions: {
      count: 0,
      asserts: [
        assertCanOnlyHaveOneObjLiteralArg,
      ],
    },
  }
  traverse(vineCompFn, (node) => {
    if (!isVineMacroCallExpression(node)) {
      return
    }
    const macroCalleeName = getVineMacroCalleeName(node)
    if (!macroCalleeName) {
      return
    }
    const macroName = (
      macroCalleeName.includes('.')
        ? macroCalleeName.split('.')[0]
        : macroCalleeName
    ) as CountingMacros
    if (macroCountMap[macroName]) {
      macroCountMap[macroName].count += 1
      macroCountMap[macroName].node = node
    }
  })

  const macroMoreThanOnce = Object.entries(macroCountMap).filter(([, it]) => it.count > 1)
  if (macroMoreThanOnce.length > 0) {
    macroMoreThanOnce.forEach(([macroName, it]) => {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: `Multiple \`${macroName}\` calls are not allowed inside Vine component function`,
            location: it.node?.loc,
          },
        ),
      )
    })
    return false
  }

  let isAssertsPass = true
  for (const [macroName, it] of Object.entries(macroCountMap)) {
    isAssertsPass = it.asserts
      .map((assert) => {
        const isPass = it.node ? assert(validatorCtx, it.node) : true
        logMacroAssert(macroName, isPass)
        return isPass
      })
      .every(Boolean)
  }

  return isAssertsPass
}

function validateVineStyleIsNotInsideLexicalDeclaration(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  vineCompFn: Node,
) {
  let isNoVariableDeclarationContainsVineStyle = true
  traverse(vineCompFn, (node) => {
    if (isVariableDeclaration(node)) {
      node.declarations.forEach((decl) => {
        if (
          isVineMacroOf([
            'vineStyle',
            'vineStyle.scoped',
          ])(decl.init)
        ) {
          vineCompilerHooks.onError(
            vineErr(
              vineFileCtx,
              {
                msg: '`vineStyle` is not allowed to be inside lexical declaration!',
                location: decl.loc,
              },
            ),
          )
          isNoVariableDeclarationContainsVineStyle = false
        }
      })
    }
  })
  return isNoVariableDeclarationContainsVineStyle
}

function validateVineFunctionCompProps(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  vineCompFn: Node,
) {
  const vineCompFnParams = getFunctionParams(vineCompFn)
  const vineCompFnParamsLength = vineCompFnParams.length
  let vinePropMacroCallCount = 0

  const isCheckVinePropMacroCallPass = () => {
    // Check vineProp macro call,
    // if doesn't call in `vineProp.default` or `vineProp.validator`,
    // a type parameter must be provided
    let isVinePropCheckPass = true
    traverse(vineCompFn, (node) => {
      if (!isVineMacroOf('vineProp')(node)) {
        return
      }
      vinePropMacroCallCount += 1
      const macroCalleeName = getVineMacroCalleeName(node)
      if (!macroCalleeName) {
        return
      }
      else if (macroCalleeName === 'vineProp') {
        const typeParamsLength = node.typeParameters?.params.length
        if (typeParamsLength === 0) {
          vineCompilerHooks.onError(
            vineErr(
              vineFileCtx,
              {
                msg: '`vineProp` macro call must have a type parameter to specify the prop\'s type',
                location: node.loc,
              },
            ),
          )
          isVinePropCheckPass = false
        }
      }
      else if (node.arguments.length !== 1) {
        const argLen = node.arguments.length
        vineCompilerHooks.onError(
          vineErr(
            vineFileCtx,
            {
              msg: `\`${macroCalleeName}\` macro call ${
                argLen > 1 ? 'can only' : 'must'
              } have one argument`,
              location: node.loc,
            },
          ),
        )
      }
    })
    return isVinePropCheckPass
  }

  if (vineCompFnParamsLength === 0) {
    return isCheckVinePropMacroCallPass()
  }
  else if (vineCompFnParamsLength === 1) {
    // Check Vine component function's formal parameter first,
    // it can only have one parameter, and its type annotation must be object literal
    const theOnlyFormalParam = vineCompFnParams[0]
    // console.log('theOnlyFormalParam', theOnlyFormalParam)
    let isCheckFormalParamsPropPass = true
    if (!isIdentifier(theOnlyFormalParam)) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'If you\'re defining a Vine component function\'s props with formal parameter, it must be one and only identifier',
            location: theOnlyFormalParam.loc,
          },
        ),
      )
      isCheckFormalParamsPropPass = false
    }
    const theOnlyFormalParamTypeAnnotation = theOnlyFormalParam.typeAnnotation
    if (!theOnlyFormalParamTypeAnnotation) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Vine component function\'s props must have a type annotation',
            location: theOnlyFormalParam.loc,
          },
        ),
      )
      isCheckFormalParamsPropPass = false
    }
    if (
      isTSTypeAnnotation(theOnlyFormalParamTypeAnnotation)
      && isTSTypeLiteral(theOnlyFormalParamTypeAnnotation.typeAnnotation)
    ) {
      // The object literal's properties must all be 'TSPropertySignature'
      // and its key must be string literal or identifier
      const propsTypeAnnotation = theOnlyFormalParamTypeAnnotation.typeAnnotation
      const isTSTypeAnnotationValid = propsTypeAnnotation.members.every(
        member => (
          isTSPropertySignature(member)
          && (
            isStringLiteral(member.key)
            || isIdentifier(member.key)
          )
        ),
      )
      if (!isTSTypeAnnotationValid) {
        vineCompilerHooks.onError(
          vineErr(
            vineFileCtx,
            {
              msg: 'Vine component function\'s props type annotation must be an object literal, '
                + 'only contains properties signature, and all properties\' key must be string literal or identifier',
              location: propsTypeAnnotation.loc,
            },
          ),
        )
        isCheckFormalParamsPropPass = false
      }
    }
    else {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Vine component function\'s props type annotation must be an object literal',
            location: theOnlyFormalParamTypeAnnotation?.loc,
          },
        ),
      )
      isCheckFormalParamsPropPass = false
    }

    if (vinePropMacroCallCount > 0) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Vine component function\'s props can only be defined with formal parameter or `vineProp` macro calls, not both',
            location: theOnlyFormalParam.loc,
          },
        ),
      )
      isCheckFormalParamsPropPass = false
    }

    if (!isCheckFormalParamsPropPass) {
      // Still check if there're maybe some invalid `vineProp` macro call
      // that should be reported
      isCheckVinePropMacroCallPass()
      return false
    }
    return isCheckVinePropMacroCallPass()
  }
  vineCompilerHooks.onError(
    vineErr(
      vineFileCtx,
      {
        msg: 'Vine component function can only have one parameter',
        location: vineCompFn.loc,
      },
    ),
  )
  return false
}

const validatesFromRoot: VineValidator[] = wrapVineValidatorWithLog([
  validateNoOutsideMacroCalls,
  validateNoInvalidTypesRootScopeStmt,
])

const validatesFromVineFn: VineValidator[] = wrapVineValidatorWithLog([
  validateVineTemplateStringUsage,
  validateMacrosUsage,
  validateVineStyleIsNotInsideLexicalDeclaration,
  validateVineFunctionCompProps,
])

function createVineValidator(
  vineCompilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
  vineCompFns: Node[],
) {
  return (
    validates: VineValidator[],
    fromNode: Node,
  ) => {
    return validates.map(
      validateFn => validateFn(
        {
          vineCompilerHooks,
          vineFileCtx,
          vineCompFns,
        },
        fromNode,
      ),
    ).filter(Boolean).length < validates.length
  }
}

export function validateVine(
  compilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
  vineCompFnDecls: Node[],
) {
  const findValidateError = createVineValidator(compilerHooks, vineFileCtx, vineCompFnDecls)
  if (findValidateError(validatesFromRoot, vineFileCtx.root)) {
    return false
  }

  // This is for collecting all errors
  // without quiting this function too early
  let hasErrInVineCompFns = false
  for (const vineCompFnDecl of vineCompFnDecls) {
    hasErrInVineCompFns = findValidateError(validatesFromVineFn, vineCompFnDecl)
  }

  return !hasErrInVineCompFns
}
