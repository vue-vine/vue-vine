import process from 'node:process'
import {
  isIdentifier,
  isObjectExpression,
  isObjectProperty,
  isStringLiteral,
  isTSFunctionType,
  isTSMethodSignature,
  isTSPropertySignature,
  isTSTypeAnnotation,
  isTSTypeLiteral,
  isTaggedTemplateExpression,
  isTemplateLiteral,
  isVariableDeclaration,
  isVariableDeclarator,
  traverse,
} from '@babel/types'
import type {
  CallExpression,
  Identifier,
  Node,
  TSMethodSignature,
  TSPropertySignature,
  TSTypeAnnotation,
  TSTypeLiteral,
  TraversalAncestors,
  VariableDeclaration,
  VariableDeclarator,
} from '@babel/types'
import type { CountingMacros, VINE_MACRO_NAMES, VineCompilerHooks, VineFileCtx } from './types'
import {
  getFunctionInfo,
  getFunctionParams,
  getVineMacroCalleeName,
  isDescendant,
  isTagTemplateStringContainsInterpolation,
  isVineMacroCallExpression,
  isVineModel,
  isVineProp,
  isVineTaggedTemplateString,
} from './babel-helpers/ast'
import { vineErr } from './diagnostics'
import {
  BARE_CALL_MACROS,
  CAN_BE_CALLED_MULTI_TIMES_MACROS,
  SUPPORTED_CSS_LANGS,
} from './constants'
import { colorful } from './utils/color-string'
import { _breakableTraverse } from './utils'

interface VineValidatorCtx {
  vineCompilerHooks: VineCompilerHooks
  vineFileCtx: VineFileCtx
  vineCompFns: Node[]
}

interface VineModelValidateCtx {
  hasDefaultModel: boolean
}

type VineValidator = (
  context: VineValidatorCtx,
  fromNode: Node,
) => boolean

function wrapVineValidatorWithLog(validators: VineValidator[]) {
  return process.env.VINE_DEV_VITEST === 'true'
    ? validators.map(validator => (...args: Parameters<VineValidator>) => {
      const isPass = validator(...args)
      // Bypass this ESLint is for local development to find out which test case is failed,
      // eslint-disable-next-line no-console
      console.log(`${
          colorful(' VINE VALIDATE ', ['bgGreen', 'white'])
        } ${validator.name} => ${
          colorful(isPass ? 'PASS' : 'FAIL', [isPass ? 'green' : 'red'])
        }`)
      return isPass
    })
    : validators
}

function vitestLogMacroAssert(macroName: string, isPass: boolean) {
  if (process.env.VINE_DEV_VITEST !== 'true') {
    return
  }
  // Bypass this ESLint is for local development to find out which assert is failed,
  // eslint-disable-next-line no-console
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
 * Check vine tagged template string usage,
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
            msg: 'Vine template string are not allowed to contain interpolation!',
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
  if (vineStyleArgsLength !== 1) {
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
  return true
}

function assertMacroCanOnlyHaveOneObjLiteralArg(
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

function assertMacroCanOnlyHaveOneTypeParam(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  macroCallNode: CallExpression,
) {
  const macroCallee = macroCallNode.callee as Identifier
  const typeParams = macroCallNode.typeParameters?.params
  const typeParamsLength = typeParams?.length
  const errMsg = `\`${macroCallee.name}\` ${
    (typeParamsLength && typeParamsLength > 1) ? 'can only' : 'must'
  } have 1 type parameter`
  if (typeParamsLength !== 1) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          location: macroCallNode.callee.loc,
        },
      ),
    )
    return false
  }
  return true
}

function assertMacroVariableDeclarationMustBeIdentifier(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  macroName: VINE_MACRO_NAMES,
  macroCallNode: CallExpression,
  parent?: TraversalAncestors,
  { isMustBeInsideVarDecl }: { isMustBeInsideVarDecl: boolean } = { isMustBeInsideVarDecl: false },
) {
  const varDeclaratorThatMayBeInside = parent?.find(ancestor => isVariableDeclarator(ancestor.node))
  if (varDeclaratorThatMayBeInside) {
    const varDeclThatMayBeInsideNode = varDeclaratorThatMayBeInside.node as VariableDeclarator
    if (!isIdentifier(varDeclThatMayBeInsideNode.id)) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: `the declaration of macro \`${macroName}\` call must be an identifier`,
            location: varDeclThatMayBeInsideNode.id.loc,
          },
        ),
      )
      return false
    }
  }
  else if (isMustBeInsideVarDecl) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: `the declaration of \`${macroName}\` macro call must be inside a variable declaration`,
          location: macroCallNode.loc,
        },
      ),
    )
    return false
  }
  return true
}

function assertVineEmitsUsage(
  validatorCtx: VineValidatorCtx,
  macroCallNode: CallExpression,
  parent?: TraversalAncestors,
) {
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  let isVineEmitsUsageCorrect = true

  if (!assertMacroCanOnlyHaveOneTypeParam(validatorCtx, macroCallNode)) {
    isVineEmitsUsageCorrect = false
  }
  else {
    const typeParams = macroCallNode.typeParameters?.params
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
      isVineEmitsUsageCorrect = false
    }
    const properties = (theOnlyTypeParam as TSTypeLiteral)?.members
    if (!properties.every(prop => isTSPropertySignature(prop))) {
      isVineEmitsUsageCorrect = false
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Vue Vine component function\'s vineEmits type must be object literal! '
            + 'And all properties\' key must be string literal or identifier',
            location: theOnlyTypeParam?.loc,
          },
        ),
      )
    }
  }

  if (
    !assertMacroVariableDeclarationMustBeIdentifier(
      validatorCtx,
      'vineEmits',
      macroCallNode,
      parent,
    )
  ) {
    isVineEmitsUsageCorrect = false
  }

  return isVineEmitsUsageCorrect
}

function assertSlotMethodSignature(
  validatorCtx: VineValidatorCtx,
  methodSignature: TSMethodSignature,
) {
  // Every method's signature must have only one parameter named `props` with a TSTypeLiteral type annotation
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  const params = methodSignature.parameters
  const errMsg = 'Function signature of `vineSlots` definition can only have one parameter named `props`'
  if (params.length !== 1) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          location: methodSignature.loc,
        },
      ),
    )
    return false
  }
  const theSignatureOnlyParam = params[0]
  let isNameNotProps = false
  if (
    !isIdentifier(theSignatureOnlyParam)
    // eslint-disable-next-line no-cond-assign
    || (isNameNotProps = theSignatureOnlyParam.name !== 'props')
  ) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: `${errMsg}${
            isNameNotProps
              ? `, and its parameter name must be \`props\`, but got \`${
                (theSignatureOnlyParam as Identifier).name
                }\``
              : ''
          }`,
          location: theSignatureOnlyParam.loc,
        },
      ),
    )
    return false
  }
  const paramTypeAnnotation = (theSignatureOnlyParam.typeAnnotation as TSTypeAnnotation)?.typeAnnotation
  if (!paramTypeAnnotation || !isTSTypeLiteral(paramTypeAnnotation)) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: `${errMsg}, and its type annotation must be object literal`,
          location: theSignatureOnlyParam.loc,
        },
      ),
    )
    return false
  }
  return true
}

function assertSlotPropertySignature(
  validatorCtx: VineValidatorCtx,
  propertySignature: TSPropertySignature,
) {
  // Every property's signature must have a TSTypeFunction type annotation
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  const typeAnnotation = propertySignature.typeAnnotation?.typeAnnotation
  if (!typeAnnotation || !isTSFunctionType(typeAnnotation)) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: 'Properties of `vineSlots` can only have function type annotation',
          location: propertySignature.loc,
        },
      ),
    )
    return false
  }

  // The function type annotation must have only one parameter named `props` with a TSTypeLiteral type annotation
  const params = typeAnnotation.parameters
  const errMsg = 'Function signature of `vineSlots` can only have one parameter named `props`'
  const firstParam = params[0]

  if (params.length !== 1 || !isIdentifier(firstParam)) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: errMsg,
          location: typeAnnotation.loc,
        },
      ),
    )
    return false
  }

  const paramTypeAnnotation = (firstParam.typeAnnotation as TSTypeAnnotation)?.typeAnnotation
  if (!paramTypeAnnotation || !isTSTypeLiteral(paramTypeAnnotation)) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: `${errMsg}, and its type annotation must be object literal`,
          location: firstParam.loc,
        },
      ),
    )
    return false
  }

  return true
}

function assertVineSlotsUsage(
  validatorCtx: VineValidatorCtx,
  macroCallNode: CallExpression,
  parent?: TraversalAncestors,
) {
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  let isVineSlotsUsageCorrect = true

  if (!assertMacroCanOnlyHaveOneTypeParam(validatorCtx, macroCallNode)) {
    isVineSlotsUsageCorrect = false
  }
  else {
    const typeParams = macroCallNode.typeParameters?.params
    const theOnlyTypeParam = typeParams?.[0]
    if (!isTSTypeLiteral(theOnlyTypeParam)) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Vue Vine component function\'s vineSlots type must be object literal!',
            location: theOnlyTypeParam?.loc,
          },
        ),
      )
      isVineSlotsUsageCorrect = false
    }
    const slotSignatures = (theOnlyTypeParam as TSTypeLiteral)?.members ?? []
    if (!slotSignatures.every((prop) => {
      if (isTSMethodSignature(prop))
        return true

      if (
        isTSPropertySignature(prop)
        && isTSFunctionType(prop.typeAnnotation?.typeAnnotation)
      ) {
        return true
      }

      return false
    })) {
      isVineSlotsUsageCorrect = false
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Every property of Vue Vine component function\'s `vineSlots` type must be function signature',
            location: theOnlyTypeParam?.loc,
          },
        ),
      )
    }

    (slotSignatures as (TSMethodSignature | TSPropertySignature)[])
      .forEach((signature) => {
        if (
          isTSMethodSignature(signature)
          && !assertSlotMethodSignature(validatorCtx, signature)
        ) {
          isVineSlotsUsageCorrect = false
        }
        else if (
          isTSPropertySignature(signature)
          && !assertSlotPropertySignature(validatorCtx, signature)
        ) {
          isVineSlotsUsageCorrect = false
        }
      })
  }

  if (
    !assertMacroVariableDeclarationMustBeIdentifier(
      validatorCtx,
      'vineSlots',
      macroCallNode,
      parent,
    )
  ) {
    isVineSlotsUsageCorrect = false
  }

  return isVineSlotsUsageCorrect
}

function assertVineModelDefaultDuplicated(
  validatorCtx: VineValidatorCtx,
  modelCtx: VineModelValidateCtx,
  macroCallNode: CallExpression,
  extraAssert: {
    isInsideVarDecl: boolean
  },
) {
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  const macroCallArgs = macroCallNode.arguments

  const isAlreadyHasDefault = modelCtx.hasDefaultModel
  let isThisOneAsDefault = false

  const isExtraAssertValid = Object.values(extraAssert).every(Boolean)

  // Judge if the current `vineModel` is treated as a default model
  if (macroCallArgs?.length === 0 && isExtraAssertValid) {
    isThisOneAsDefault = true
  }
  else if (
    macroCallArgs?.length === 1
    && isObjectExpression(macroCallArgs[0])
    && isExtraAssertValid
  ) {
    isThisOneAsDefault = true
  }

  if (isThisOneAsDefault) {
    if (isAlreadyHasDefault) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'Vue Vine component function can only have one default model',
            location: macroCallNode.loc,
          },
        ),
      )
      return false
    }

    // Got the first and the only default model
    modelCtx.hasDefaultModel = true
  }

  return true
}

function assertVineModelUsage(
  validatorCtx: VineValidatorCtx,
  modelCtx: VineModelValidateCtx,
  macroCallNode: CallExpression,
  parent?: TraversalAncestors,
) {
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  let isVineModelUsageCorrect = true

  const typeParams = macroCallNode.typeParameters?.params
  const macroCallArgs = macroCallNode.arguments
  const lastArg = macroCallArgs?.[macroCallArgs.length - 1]

  if (typeParams?.length === 0) {
    // vineModel can be called without type parameter and argument,
    // if so, it's a `Ref<unknown>` type and user will notice that during reference it.
    if (macroCallArgs?.length === 0) {
      // PASS! Very simple case
    }
    // Check the last argument, i.e. the options object literal
    // if there's not a 'default' field, report an error for no type parameter defined
    else if (
      isObjectExpression(lastArg)
      && !lastArg.properties.some((prop) => {
        if (
          isObjectProperty(prop)
          && isIdentifier(prop.key)
          && prop.key.name === 'default'
        ) {
          return true
        }

        return false
      })
    ) {
      vineCompilerHooks.onError(
        vineErr(
          vineFileCtx,
          {
            msg: 'If `vineModel` macro call doesn\'t have type parameter, it must have a `default` field in the options object literal',
            location: lastArg.loc,
          },
        ),
      )
      isVineModelUsageCorrect = false
    }
  }

  let isInsideVarDecl = false

  // vineModel macro call must be inside a variable declaration
  if (
    !assertMacroVariableDeclarationMustBeIdentifier(
      validatorCtx,
      'vineModel',
      macroCallNode,
      parent,
      {
        isMustBeInsideVarDecl: true,
      },
    )
  ) {
    isVineModelUsageCorrect = false
  }
  else {
    isInsideVarDecl = true
  }

  // Check the at most 2 arguments of `vineModel` macro call
  if (macroCallArgs?.length > 2) {
    vineCompilerHooks.onError(
      vineErr(
        vineFileCtx,
        {
          msg: '`vineModel` macro call can only have at most 2 arguments',
          location: macroCallNode.loc,
        },
      ),
    )
    isVineModelUsageCorrect = false
  }
  else {
    isVineModelUsageCorrect = assertVineModelDefaultDuplicated(
      validatorCtx,
      modelCtx,
      macroCallNode,
      {
        isInsideVarDecl,
      },
    )
  }

  return isVineModelUsageCorrect
}

function validateMacrosUsage(
  validatorCtx: VineValidatorCtx,
  vineCompFn: Node,
) {
  type MacroAssert = (
    context: VineValidatorCtx,
    macroCallNode: CallExpression,
    parent?: TraversalAncestors,
  ) => boolean
  interface MacroDescriptor {
    count: number
    asserts: MacroAssert[]
    checkMultiCall?: boolean
    node?: CallExpression
    parent?: TraversalAncestors
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
        assertVineEmitsUsage,
      ],
    },
    vineSlots: {
      count: 0,
      asserts: [
        assertVineSlotsUsage,
      ],
    },
    vineExpose: {
      count: 0,
      asserts: [
        assertMacroCanOnlyHaveOneObjLiteralArg,
      ],
    },
    vineOptions: {
      count: 0,
      asserts: [
        assertMacroCanOnlyHaveOneObjLiteralArg,
      ],
    },
    vineCustomElement: {
      count: 0,
      asserts: [],
    },
  }

  let isCountCorrect = true
  let isBareCallMacrosPass = true

  traverse(vineCompFn, {
    enter(node, parent) {
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
        macroCountMap[macroName].parent = [...parent]
      }

      const VarDeclThatMacroBeInside = parent.find(ancestor => (
        isVariableDeclaration(ancestor.node)
      ))
      if (VarDeclThatMacroBeInside && (BARE_CALL_MACROS as any).includes(macroName)) {
        isBareCallMacrosPass = false
        vineCompilerHooks.onError(
          vineErr(
            vineFileCtx,
            {
              msg: `\`${macroName}\` macro call is not allowed to be inside a variable declaration`,
              location: VarDeclThatMacroBeInside?.node.loc,
            },
          ),
        )
      }
    },
  })

  // Check if a macro is called only once,
  const macroMoreThanOnce = Object
    .entries(macroCountMap)
    .filter(([macroName, it]) => {
      if (CAN_BE_CALLED_MULTI_TIMES_MACROS.includes(macroName)) {
        return false
      }

      return it.count > 1
    })
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
    isCountCorrect = false
  }

  const isAssertsPass = Object.entries(macroCountMap)
    .map(([macroName, it]) => it.asserts
      .map((assert) => {
        const isPass = it.node
          ? assert(validatorCtx, it.node, it.parent)
          : true
        vitestLogMacroAssert(macroName, isPass)
        return isPass
      })
      .every(Boolean),
    ).every(Boolean)

  return isCountCorrect && isBareCallMacrosPass && isAssertsPass
}

function validateVineModel(
  validatorCtx: VineValidatorCtx,
  vineCompFn: Node,
) {
  // Find all `vineModel` macro calls
  const vineModelMacroCalls: Array<{
    macroCall: CallExpression
    parent: TraversalAncestors
  }> = []

  _breakableTraverse(vineCompFn, (node, parent) => {
    if (isVineModel(node)) {
      vineModelMacroCalls.push({
        macroCall: node,
        parent: [...parent],
      })
    }
  })

  let isVineModelUsageCorrect = true
  const modelCtx: VineModelValidateCtx = {
    hasDefaultModel: false,
  }
  for (const { macroCall, parent } of vineModelMacroCalls) {
    // Assert every `vineModel` macro call
    if (!assertVineModelUsage(
      validatorCtx,
      modelCtx,
      macroCall,
      parent,
    )
    ) {
      isVineModelUsageCorrect = false
    }
  }

  return isVineModelUsageCorrect
}

function validateVineFunctionCompProps(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  vineCompFnDecl: Node,
) {
  const { fnItselfNode } = getFunctionInfo(vineCompFnDecl)
  const vineCompFnParams = fnItselfNode ? getFunctionParams(fnItselfNode) : []
  const vineCompFnParamsLength = vineCompFnParams.length
  let vinePropMacroCallCount = 0

  const isCheckVinePropMacroCallPass = () => {
    // Check vineProp macro call,
    // if doesn't call in `vineProp.default` or `vineProp.validator`,
    // a type parameter must be provided
    let isVinePropCheckPass = true
    traverse(vineCompFnDecl, {
      enter(node, parent) {
        if (!isVineProp(node)) {
          return
        }
        vinePropMacroCallCount += 1
        const macroCalleeName = getVineMacroCalleeName(node)
        if (!macroCalleeName) {
          return
        }
        if (macroCalleeName !== 'vineProp.withDefault') {
          const typeParamsLength = node.typeParameters?.params.length
          if (typeParamsLength !== 1) {
            vineCompilerHooks.onError(
              vineErr(
                vineFileCtx,
                {
                  msg: `\`${macroCalleeName}\` macro call ${
                    (typeParamsLength && typeParamsLength > 1)
                      ? 'can only'
                      : 'must'
                  } have a type parameter to specify the prop\'s type`,
                  location: node.loc,
                },
              ),
            )
            isVinePropCheckPass = false
          }
        }
        else if (!node.arguments.length) {
          isVinePropCheckPass = false
          // `vineProp.withDefault` macro call must have at least 1 argument
          vineCompilerHooks.onError(
            vineErr(
              vineFileCtx,
              {
                msg: `\`${macroCalleeName}\` macro call must have at least 1 argument`,
                location: node.loc,
              },
            ),
          )
        }

        const parentVarDecl = parent.find(ancestor => isVariableDeclaration(ancestor.node))
        const parentVarDeclarator = parent.find(ancestor => isVariableDeclarator(ancestor.node))
        if (!parentVarDecl || !parentVarDeclarator) {
          isVinePropCheckPass = false
          vineCompilerHooks.onError(
            vineErr(
              vineFileCtx,
              {
                msg: '`vineProp` macro call must be inside a `const` variable declaration',
                location: node.loc,
              },
            ),
          )
        }
        else {
          const isConst = (parentVarDecl.node as VariableDeclaration).kind === 'const'
          if (!isConst) {
            isVinePropCheckPass = false
            vineCompilerHooks.onError(
              vineErr(
                vineFileCtx,
                {
                  msg: '`vineProp` macro call must be inside a `const` declaration',
                  location: parentVarDecl.node.loc,
                },
              ),
            )
          }
          const varDeclarator = parentVarDeclarator.node as VariableDeclarator
          // the variable declarator must be an identifier, destructure pattern is not allowed
          if (!isIdentifier(varDeclarator.id)) {
            isVinePropCheckPass = false
            vineCompilerHooks.onError(
              vineErr(
                vineFileCtx,
                {
                  msg: 'the declaration of `vineProp` macro call must be an identifier',
                  location: varDeclarator.id.loc,
                },
              ),
            )
          }
        }
      },
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
        location: vineCompFnDecl.loc,
      },
    ),
  )
  return false
}

const validatesFromRoot: VineValidator[] = wrapVineValidatorWithLog([
  validateNoOutsideMacroCalls,
])

const validatesFromVineFn: VineValidator[] = wrapVineValidatorWithLog([
  validateVineTemplateStringUsage,
  validateMacrosUsage,
  validateVineModel,
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
    const hasErr = findValidateError(validatesFromVineFn, vineCompFnDecl)
    if (hasErr)
      hasErrInVineCompFns = hasErr
  }

  return !hasErrInVineCompFns
}
