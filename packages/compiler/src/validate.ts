import type {
  ArrayExpression,
  CallExpression,
  Identifier,
  Node,
  TraversalAncestors,
  TSMethodSignature,
  TSPropertySignature,
  TSTypeAnnotation,
  TSTypeLiteral,
  VariableDeclaration,
  VariableDeclarator,
} from '@babel/types'
import type { CountingMacros, MacroAssertCtx, VINE_MACRO_NAMES, VineCompilerHooks, VineFileCtx, VineFnPickedInfo, VineValidatorCtx } from './types'
import process from 'node:process'
import {
  isArrayExpression,
  isIdentifier,
  isObjectExpression,
  isObjectPattern,
  isObjectProperty,
  isRestElement,
  isStringLiteral,
  isTaggedTemplateExpression,
  isTemplateLiteral,
  isTSFunctionType,
  isTSMethodSignature,
  isTSPropertySignature,
  isTSTypeAnnotation,
  isTSTypeLiteral,
  isVariableDeclaration,
  isVariableDeclarator,
  traverse,
} from '@babel/types'
import {
  getFunctionParams,
  getFunctionPickedInfos,
  getVineMacroCalleeName,
  isDescendant,
  isTagTemplateStringContainsInterpolation,
  isVineMacroCallExpression,
  isVineModel,
  isVineProp,
  isVineTaggedTemplateString,
} from './babel-helpers/ast'
import {
  CAN_BE_CALLED_MULTI_TIMES_MACROS,
  SUPPORTED_CSS_LANGS,
} from './constants'
import { vineErr, vineWarn } from './diagnostics'
import { _breakableTraverse } from './utils'
import { colorful } from './utils/color-string'

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
          { vineFileCtx },
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
          { vineFileCtx },
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
          { vineFileCtx },
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

function assertMacroCallMustBeBare(
  { vineCompilerHooks, vineFileCtx }: MacroAssertCtx,
  macroCallNode: CallExpression,
  parent?: TraversalAncestors,
) {
  const isParentNotEmpty = parent && parent.length > 0
  const isBareCall = Boolean(isParentNotEmpty && parent[parent.length - 1]!.node.type === 'ExpressionStatement')
  const isInsideVarDecl = Boolean(isParentNotEmpty && parent!.some(ancestor => isVariableDeclaration(ancestor.node)))

  const macroName = getVineMacroCalleeName(macroCallNode)
  const errMsg = (
    isInsideVarDecl
      ? `\`${macroName}\` macro call is not allowed to be inside a variable declaration`
      : `\`${macroName}\` call must be a bare call`
  )

  if (!isBareCall) {
    vineCompilerHooks.onError(
      vineErr(
        { vineFileCtx },
        {
          msg: errMsg,
          location: macroCallNode.loc,
        },
      ),
    )
  }

  return isBareCall
}

function assertVineStyleUsage(
  { vineCompilerHooks, vineFileCtx }: MacroAssertCtx,
  vineStyleMacroCallNode: CallExpression,
) {
  const vineStyleArgsLength = vineStyleMacroCallNode.arguments.length
  const macroCallee = vineStyleMacroCallNode.callee as Identifier
  if (vineStyleArgsLength !== 1) {
    vineCompilerHooks.onError(
      vineErr(
        { vineFileCtx },
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
          { vineFileCtx },
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
          { vineFileCtx },
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
        { vineFileCtx },
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
  { vineCompilerHooks, vineFileCtx }: MacroAssertCtx,
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
          { vineFileCtx },
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
        { vineFileCtx },
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
  { vineCompilerHooks, vineFileCtx }: MacroAssertCtx,
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
        { vineFileCtx },
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
          { vineFileCtx },
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
        { vineFileCtx },
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
  validatorCtx: MacroAssertCtx,
  macroCallNode: CallExpression,
  parent?: TraversalAncestors,
) {
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  let isVineEmitsUsageCorrect = true

  const callArgs = macroCallNode.arguments
  const typeParams = macroCallNode.typeParameters?.params
  if (!typeParams || typeParams.length === 0) {
    // No type parameter and no argument, it's a invalid usage
    // which doesn't provide emits key for Vue component
    const isVineEmitsArgCorrect = !!(
      callArgs.length === 1
      && isArrayExpression(callArgs[0])
      && (callArgs[0] as ArrayExpression).elements.every(el => isStringLiteral(el))
    )

    if (!isVineEmitsArgCorrect) {
      vineCompilerHooks.onError(
        vineErr(
          { vineFileCtx },
          {
            msg: '`vineEmits` macro must have a type parameter or an array of string for event names',
            location: callArgs[0]?.loc,
          },
        ),
      )
    }

    isVineEmitsUsageCorrect = isVineEmitsArgCorrect
  }
  else {
    const theOnlyTypeParam = typeParams?.[0]
    if (!isTSTypeLiteral(theOnlyTypeParam)) {
      vineCompilerHooks.onError(
        vineErr(
          { vineFileCtx },
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
          { vineFileCtx },
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
  validatorCtx: MacroAssertCtx,
  methodSignature: TSMethodSignature,
) {
  // Every method's signature must have only one parameter named `props` with a TSTypeLiteral type annotation
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  const params = methodSignature.parameters
  const errMsg = 'Function signature of `vineSlots` definition can only have one parameter named `props`'
  if (params.length !== 1) {
    vineCompilerHooks.onError(
      vineErr(
        { vineFileCtx },
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
        { vineFileCtx },
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
        { vineFileCtx },
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
  validatorCtx: MacroAssertCtx,
  propertySignature: TSPropertySignature,
) {
  // Every property's signature must have a TSTypeFunction type annotation
  const { vineCompilerHooks, vineFileCtx } = validatorCtx
  const typeAnnotation = propertySignature.typeAnnotation?.typeAnnotation
  if (!typeAnnotation || !isTSFunctionType(typeAnnotation)) {
    vineCompilerHooks.onError(
      vineErr(
        { vineFileCtx },
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
        { vineFileCtx },
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
        { vineFileCtx },
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
  validatorCtx: MacroAssertCtx,
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
          { vineFileCtx },
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
          { vineFileCtx },
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
          { vineFileCtx },
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
  const firstArg = macroCallArgs?.[0]
  const lastArg = macroCallArgs?.[macroCallArgs.length - 1]

  if (firstArg) {
    if (isObjectExpression(firstArg)) {
      // PASS for this check
    }
    else if (!isStringLiteral(firstArg)) {
      vineCompilerHooks.onError(
        vineErr(
          { vineFileCtx },
          {
            msg: 'The given vineModel name must be a string literal',
            location: firstArg.loc,
          },
        ),
      )
    }
  }

  if (typeParams?.length === 0) {
    // vineModel can be called without type parameter and argument,
    // if so, it's a `Ref<unknown>` type and user will notice that during reference it.
    // But we can give a warning here.
    if (macroCallArgs?.length === 0) {
      vineCompilerHooks.onWarn(
        vineWarn(
          { vineFileCtx },
          {
            msg: '`vineModel` without type parameter will receive a `Ref<unknown>`.',
            location: macroCallNode.loc,
          },
        ),
      )
    }
    // Check the last argument, i.e. the options object literal
    // if there's not a 'default' field, report an error for no type parameter defined
    else if (
      isObjectExpression(lastArg)
      && !lastArg.properties.some(prop => (
        isObjectProperty(prop)
        && isIdentifier(prop.key)
        && prop.key.name === 'default'
      ))
    ) {
      vineCompilerHooks.onError(
        vineErr(
          { vineFileCtx },
          {
            msg: 'If `vineModel` macro call doesn\'t have type parameter, it must have a `default` field in options',
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
        { vineFileCtx },
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
    context: MacroAssertCtx,
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
  const macroCountMap: Partial<Record<CountingMacros, MacroDescriptor>> = {
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
        assertMacroCallMustBeBare,
      ],
    },
    vineOptions: {
      count: 0,
      asserts: [
        assertMacroCanOnlyHaveOneObjLiteralArg,
        assertMacroCallMustBeBare,
      ],
    },
    vineCustomElement: {
      count: 0,
      asserts: [
        assertMacroCallMustBeBare,
      ],
    },
    vineValidators: {
      count: 0,
      asserts: [
        assertMacroCanOnlyHaveOneObjLiteralArg,
        assertMacroCallMustBeBare,
      ],
    },
  }

  let isCountCorrect = true

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
          { vineFileCtx },
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
          ? assert({
              ...validatorCtx,
              fromVineCompFnNode: vineCompFn,
            }, it.node, it.parent)
          : true
        vitestLogMacroAssert(macroName, isPass)
        return isPass
      })
      .every(Boolean),
    )
    .every(Boolean)

  return isCountCorrect && isAssertsPass
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

function validatePropsForSingelFC(
  { vineCompilerHooks, vineFileCtx }: VineValidatorCtx,
  {
    fnDeclNode: vineCompFnDecl,
    fnItselfNode,
  }: VineFnPickedInfo,
) {
  const vineCompFnParams = fnItselfNode ? getFunctionParams(fnItselfNode) : []
  const vineCompFnParamsLength = vineCompFnParams.length

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
        const macroCalleeName = getVineMacroCalleeName(node)
        if (!macroCalleeName) {
          return
        }
        if (macroCalleeName !== 'vineProp.withDefault') {
          const typeParamsLength = node.typeParameters?.params.length
          if (typeParamsLength !== 1) {
            vineCompilerHooks.onError(
              vineErr(
                { vineFileCtx },
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
              { vineFileCtx },
              {
                msg: `\`${macroCalleeName}\` macro call must have at least 1 argument`,
                location: node.loc,
              },
            ),
          )
        }
        else if (node.arguments.length > 2) {
          isVinePropCheckPass = false
          // `vineProp.withDefault` macro call can only have at most 2 arguments
          vineCompilerHooks.onError(
            vineErr(
              { vineFileCtx },
              {
                msg: `\`${macroCalleeName}\` macro call can only have at most 2 arguments`,
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
              { vineFileCtx },
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
                { vineFileCtx },
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
                { vineFileCtx },
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
    // it can only have one parameter, and it must have a type annotation
    const theOnlyFormalParam = vineCompFnParams[0]
    let isCheckFormalParamsPropPass = true

    if (isObjectPattern(theOnlyFormalParam)) {
      // Make sure every destructured property is an identifier
      for (const property of theOnlyFormalParam.properties) {
        const isValidKey = (
          (isRestElement(property) && isIdentifier(property.argument))
          || (isObjectProperty(property) && (isIdentifier(property.key) || isStringLiteral(property.key)))
        )
        if (!isValidKey) {
          isCheckFormalParamsPropPass = false
          vineCompilerHooks.onError(
            vineErr(
              { vineFileCtx },
              {
                msg: `Invalid property name when defining props with formal parameter!`,
                location: theOnlyFormalParam.loc,
              },
            ),
          )
        }

        // Error on nested destructuring
        if (
          isObjectProperty(property)
          && property.value.type.endsWith('Pattern')
          && property.value.type !== 'AssignmentPattern'
        ) {
          isCheckFormalParamsPropPass = false
          vineCompilerHooks.onError(
            vineErr(
              { vineFileCtx },
              {
                msg: 'When destructuring props on formal parameter, nested destructuring is not allowed',
                location: property.loc,
              },
            ),
          )
        }
      }
    }

    const theOnlyFormalParamTypeAnnotation = theOnlyFormalParam.typeAnnotation
    if (!theOnlyFormalParamTypeAnnotation) {
      vineCompilerHooks.onError(
        vineErr(
          { vineFileCtx },
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
            { vineFileCtx },
            {
              msg: 'When Vine component function\'s props type annotation is an object literal, '
                + 'properties\' key must be an identifier or a string literal',
              location: propsTypeAnnotation.loc,
            },
          ),
        )
        isCheckFormalParamsPropPass = false
      }
    }

    // Still check if there're maybe some invalid `vineProp` macro call
    // that should be reported, we don't allow two defintion styles to be used together
    _breakableTraverse(
      vineCompFnDecl,
      (node) => {
        if (isVineProp(node)) {
          vineCompilerHooks.onError(
            vineErr(
              { vineFileCtx },
              {
                msg: '`vineProp` macro calls is not allowed when props with props formal parameter defined',
                location: node.loc,
              },
            ),
          )
          isCheckFormalParamsPropPass = false
        }
      },
    )

    return isCheckFormalParamsPropPass
  }
  vineCompilerHooks.onError(
    vineErr(
      { vineFileCtx },
      {
        msg: 'Vine component function can only have one parameter',
        location: vineCompFnDecl.loc,
      },
    ),
  )
  return false
}

function validateVineFunctionCompProps(
  validatorCtx: VineValidatorCtx,
  vineCompFnDecl: Node,
) {
  const vineFnInfos = getFunctionPickedInfos(vineCompFnDecl)
  const results = vineFnInfos.map(
    vineFnInfo => validatePropsForSingelFC(
      validatorCtx,
      vineFnInfo,
    ),
  )

  return results.every(Boolean)
}

const validatesFromRoot: VineValidator[] = wrapVineValidatorWithLog([
  validateNoOutsideMacroCalls,
])

const validatesFromVineFnItself: VineValidator[] = wrapVineValidatorWithLog([
  validateVineTemplateStringUsage,
  validateMacrosUsage,
  validateVineModel,
])

const validatesFromVineFnDecl: VineValidator[] = wrapVineValidatorWithLog([
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
): boolean {
  const findValidateError = createVineValidator(compilerHooks, vineFileCtx, vineCompFnDecls)
  if (findValidateError(validatesFromRoot, vineFileCtx.root)) {
    return false
  }

  // This is for collecting all errors
  // without quiting this function too early
  let hasErrInVineCompFns = false
  for (const vineCompFnDecl of vineCompFnDecls) {
    const vineFnInfos = getFunctionPickedInfos(vineCompFnDecl)
    vineFnInfos.forEach(({ fnDeclNode, fnItselfNode }) => {
      const hasErrInDecl = findValidateError(validatesFromVineFnDecl, fnDeclNode)
      if (hasErrInDecl) {
        hasErrInVineCompFns = true
      }
      if (!fnItselfNode) {
        return
      }
      const hasErrInFnItself = findValidateError(validatesFromVineFnItself, fnItselfNode)
      if (hasErrInFnItself) {
        hasErrInVineCompFns = true
      }
    })
  }

  return !hasErrInVineCompFns
}
