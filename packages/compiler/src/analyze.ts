import hashId from 'hash-sum'
import type { BindingTypes } from '@vue/compiler-dom'
import { walkIdentifiers } from '@vue/compiler-dom'
import {
  isArrayPattern,
  isBlockStatement,
  isBooleanLiteral,
  isClassDeclaration,
  isDeclaration,
  isExportDeclaration,
  isFunctionDeclaration,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isObjectPattern,
  isStringLiteral,
  isTSMethodSignature,
  isTSPropertySignature,
  isTaggedTemplateExpression,
  isTemplateLiteral,
  isVariableDeclaration,
  isVariableDeclarator,
} from '@babel/types'
import type {
  ArrayPattern,
  ArrowFunctionExpression,
  CallExpression,
  Declaration,
  FunctionExpression,
  Identifier,
  Node,
  ObjectPattern,
  Statement,
  StringLiteral,
  TSFunctionType,
  TSPropertySignature,
  TSTypeAnnotation,
  TSTypeLiteral,
  VariableDeclaration,
  VariableDeclarator,
} from '@babel/types'
import { DEFAULT_MODEL_MODIFIERS_NAME, VineBindingTypes } from './constants'
import type {
  BabelFunctionNodeTypes,
  Nil,
  VINE_MACRO_NAMES,
  VineCompFnCtx,
  VineCompilerHooks,
  VineFileCtx,
  VineFnPickedInfo,
  VinePropMeta,
  VineStyleLang,
  VineStyleMeta,
  VineStyleValidArg,
  VineUserImport,
} from './types'

import {
  canNeverBeRef,
  findVineTagTemplateStringReturn,
  getAllVinePropMacroCall,
  getFunctionParams,
  getFunctionPickedInfos,
  getImportStatements,
  getTSTypeLiteralPropertySignatureName,
  getVineMacroCalleeName,
  getVinePropCallTypeParams,
  isCallOf,
  isStaticNode,
  isVineCompFnDecl,
  isVineCustomElement,
  isVineEmits,
  isVineMacroCallExpression,
  isVineMacroOf,
  isVineModel,
  isVineSlots,
  isVineStyle,
  tryInferExpressionTSType,
} from './babel-helpers/ast'
import { parseCssVars } from './style/analyze-css-vars'
import { isImportUsed } from './template/importUsageCheck'
import { vineWarn } from './diagnostics'
import { _breakableTraverse, exitTraverse } from './utils'

interface AnalyzeCtx {
  vineCompilerHooks: VineCompilerHooks
  vineFileCtx: VineFileCtx
  vineCompFnCtx: VineCompFnCtx
}

type AnalyzeRunner = (
  analyzeCtx: AnalyzeCtx,
  fnItselfNode: BabelFunctionNodeTypes,
) => void

function storeTheOnlyMacroCallArg(
  macroName: VINE_MACRO_NAMES,
  callback: (analyzeCtx: AnalyzeCtx, macroCallArg: Node) => void,
): AnalyzeRunner {
  const findMacroCallNode: (fnItselfNode: BabelFunctionNodeTypes) => CallExpression | undefined = (
    fnItselfNode,
  ) => {
    let vineExposeMacroCall: CallExpression | undefined
    _breakableTraverse(fnItselfNode, {
      enter(descendant) {
        if (isVineMacroOf(macroName)(descendant)) {
          vineExposeMacroCall = descendant
          throw exitTraverse
        }
      },
    })
    return vineExposeMacroCall
  }

  return (analyzeCtx, fnItselfNode) => {
    const macroCall = findMacroCallNode(fnItselfNode)
    if (!macroCall) {
      return
    }
    const macroCallArg = macroCall.arguments[0]
    if (!macroCallArg) {
      return
    }
    callback(analyzeCtx, macroCallArg)
  }
}

const analyzeVineExpose = storeTheOnlyMacroCallArg(
  'vineExpose',
  ({ vineCompFnCtx }, macroCallArg) => {
    vineCompFnCtx.expose = macroCallArg
  },
)

const analyzeVineOptions = storeTheOnlyMacroCallArg(
  'vineOptions',
  ({ vineCompFnCtx }, macroCallArg) => {
    vineCompFnCtx.options = macroCallArg
  },
)

function registerBinding(
  bindings: Record<string, BindingTypes>,
  node: Identifier,
  type: BindingTypes,
) {
  bindings[node.name] = type
}

function walkPattern(
  node: Node,
  bindings: Record<string, BindingTypes>,
  isConst: boolean,
) {
  if (node.type === 'Identifier') {
    const type = isConst
      ? VineBindingTypes.SETUP_MAYBE_REF
      : VineBindingTypes.SETUP_LET
    registerBinding(bindings, node, type)
  }
  else if (node.type === 'RestElement') {
    // argument can only be identifier when destructuring
    const type = isConst ? VineBindingTypes.SETUP_CONST : VineBindingTypes.SETUP_LET
    registerBinding(bindings, node.argument as Identifier, type)
  }
  else if (node.type === 'ObjectPattern') {
    walkObjectPattern(node, bindings, isConst)
  }
  else if (node.type === 'ArrayPattern') {
    walkArrayPattern(node, bindings, isConst)
  }
  else if (node.type === 'AssignmentPattern') {
    if (node.left.type === 'Identifier') {
      const type = isConst
        ? VineBindingTypes.SETUP_MAYBE_REF
        : VineBindingTypes.SETUP_LET
      registerBinding(bindings, node.left, type)
    }
    else {
      walkPattern(node.left, bindings, isConst)
    }
  }
}

function walkArrayPattern(
  node: ArrayPattern,
  bindings: Record<string, BindingTypes>,
  isConst: boolean,
) {
  for (const e of node.elements) {
    e && walkPattern(e, bindings, isConst)
  }
}

function walkObjectPattern(
  node: ObjectPattern,
  bindings: Record<string, BindingTypes>,
  isConst: boolean,
) {
  for (const p of node.properties) {
    if (p.type === 'ObjectProperty') {
      if (p.key.type === 'Identifier' && p.key === p.value) {
        // shorthand: const { x } = ...
        const type = isConst
          ? VineBindingTypes.SETUP_MAYBE_REF
          : VineBindingTypes.SETUP_LET
        registerBinding(bindings, p.key, type)
      }
      else {
        walkPattern(p.value, bindings, isConst)
      }
    }
    else {
      // ...rest
      // argument can only be identifier when destructuring
      const type = isConst ? VineBindingTypes.SETUP_CONST : VineBindingTypes.SETUP_LET
      registerBinding(bindings, p.argument as Identifier, type)
    }
  }
}

function analyzeVariableDeclarationForBindings(
  { vineFileCtx, vineCompFnCtx }: AnalyzeCtx,
  stmt: VariableDeclaration,
) {
  const userImportAliases = { ...vineFileCtx.vueImportAliases }
  const userReactiveBinding = userImportAliases.reactive
  const allDeclarators = stmt.declarations
  const isConst = stmt.kind === 'const'
  const isAllLiteral = (
    isConst
    && allDeclarators.every(
      decl => (
        isIdentifier(decl.id)
        && decl.init
        && isStaticNode(decl.init)
      ),
    )
  )

  for (const varDecl of allDeclarators) {
    if (isIdentifier(varDecl.id) && varDecl.init) {
      let bindingType
      if (
        isAllLiteral || (isConst && isStaticNode(varDecl.init))
      ) {
        bindingType = VineBindingTypes.LITERAL_CONST
      }
      else if (isCallOf(varDecl.init, userReactiveBinding)) {
        // treat reactive() calls as let since it's meant to be mutable
        bindingType = isConst
          ? VineBindingTypes.SETUP_REACTIVE_CONST
          : VineBindingTypes.SETUP_LET
      }
      else if (
        // if a declaration is a const literal, we can mark it so that
        // the generated render fn code doesn't need to unref() it
        isConst && canNeverBeRef(varDecl.init, userReactiveBinding)
      ) {
        bindingType = VineBindingTypes.SETUP_CONST
      }
      else if (isConst) {
        if (
          isCallOf(
            varDecl.init,
            m =>
              m === userImportAliases.ref
              || m === userImportAliases.computed
              || m === userImportAliases.shallowRef
              || m === userImportAliases.customRef
              || m === userImportAliases.toRef,
          )
        ) {
          bindingType = VineBindingTypes.SETUP_REF
        }
        else {
          bindingType = VineBindingTypes.SETUP_MAYBE_REF
        }
      }
      else {
        bindingType = VineBindingTypes.SETUP_LET
      }
      registerBinding(vineCompFnCtx.bindings, varDecl.id, bindingType)
    }
    else if (isObjectPattern(varDecl.id)) {
      walkObjectPattern(
        varDecl.id,
        vineCompFnCtx.bindings,
        isConst,
      )
    }
    else if (isArrayPattern(varDecl.id)) {
      walkArrayPattern(
        varDecl.id,
        vineCompFnCtx.bindings,
        isConst,
      )
    }
  }

  return isAllLiteral
}

function analyzeVineFnBodyStmtForBindings(
  analyzeCtx: AnalyzeCtx,
  stmt: Statement,
) {
  const { vineCompFnCtx } = analyzeCtx
  let isAllLiteral = false
  switch (stmt.type) {
    case 'VariableDeclaration':
      isAllLiteral = analyzeVariableDeclarationForBindings(analyzeCtx, stmt)
      break
    case 'TSEnumDeclaration':
      isAllLiteral = stmt.members.every(
        member => !member.initializer || isStaticNode(member.initializer),
      )
      vineCompFnCtx.bindings[stmt.id!.name] = isAllLiteral
        ? VineBindingTypes.LITERAL_CONST
        : VineBindingTypes.SETUP_CONST
      break
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
      vineCompFnCtx.bindings[stmt.id!.name] = VineBindingTypes.SETUP_CONST
      break
    default:
      break
  }
  return isAllLiteral
}

function getVineStyleSource(vineStyleArg: VineStyleValidArg) {
  let styleLang: VineStyleLang = 'css'
  let styleSource = ''
  let range: [number, number] | undefined
  if (isTaggedTemplateExpression(vineStyleArg)) {
    const { tag } = vineStyleArg
    if (isIdentifier(tag)) {
      styleLang = tag.name as VineStyleLang
      const styleSourceNode = vineStyleArg.quasi.quasis[0]
      styleSource = styleSourceNode.value.raw
      range = [styleSourceNode.start!, styleSourceNode.end!]
    }
  }
  else if (isStringLiteral(vineStyleArg)) {
    styleSource = vineStyleArg.value
    range = [vineStyleArg.start!, vineStyleArg.end!]
  }
  else if (isTemplateLiteral(vineStyleArg)) {
    const styleSourceNode = vineStyleArg.quasis[0]
    styleSource = styleSourceNode.value.raw
    range = [styleSourceNode.start!, styleSourceNode.end!]
  }
  return {
    styleSource,
    styleLang,
    range,
  }
}

const analyzeVineProps: AnalyzeRunner = (
  // eslint-disable-next-line unused-imports/no-unused-vars
  { vineCompilerHooks, vineCompFnCtx, vineFileCtx },
  fnItselfNode,
) => {
  const formalParams = getFunctionParams(fnItselfNode)
  if (formalParams.length === 1) {
    // The Vine validator has guranateed there's only one formal params,
    // its type is `identifier`, and it must have an object literal type annotation.
    // Save this parameter's name as `propsAlias`
    const propsFormalParam = formalParams[0] as Identifier
    const propsTypeAnnotation = (propsFormalParam.typeAnnotation as TSTypeAnnotation).typeAnnotation as TSTypeLiteral
    vineCompFnCtx.propsAlias = propsFormalParam.name;
    // Analyze the object literal type annotation
    // and save the props info into `vineCompFnCtx.props`
    (propsTypeAnnotation.members as TSPropertySignature[])?.forEach((member) => {
      if (!isIdentifier(member.key)) {
        return
      }
      const propName = member.key.name
      const propType = vineFileCtx.getAstNodeContent(member.typeAnnotation!.typeAnnotation)
      const propMeta: VinePropMeta = {
        isFromMacroDefine: false,
        isRequired: member.optional === undefined ? true : !member.optional,
        isBool: [
          'boolean',
          'Boolean',
          'true',
          'false',
        ].includes(propType),
        typeAnnotationRaw: propType,
      }
      vineCompFnCtx.props[propName] = propMeta
      vineCompFnCtx.bindings[propName] = VineBindingTypes.PROPS
    })
  }
  else if (formalParams.length === 0) {
    // No formal parameters, analyze props by macro calls
    const allVinePropMacroCalls = getAllVinePropMacroCall(fnItselfNode)
    allVinePropMacroCalls.forEach(([macroCall, propVarIdentifier]) => {
      const macroCalleeName = getVineMacroCalleeName(macroCall) as VINE_MACRO_NAMES
      const propMeta: VinePropMeta = {
        isFromMacroDefine: true,
        isRequired: macroCalleeName !== 'vineProp.optional',
        isBool: false,
        typeAnnotationRaw: 'any',
      }

      if (macroCalleeName === 'vineProp.withDefault') {
        // in `vineProp.withDefault`, type info comes from type inference by default value
        // TypeScript will report but it's not guranteed that there's a default value.
        propMeta.default = macroCall.arguments[0]
        propMeta.validator = macroCall.arguments[1]
        propMeta.isBool = isBooleanLiteral(propMeta.default)

        const inferredType = tryInferExpressionTSType(propMeta.default)
        propMeta.typeAnnotationRaw = inferredType
      }
      else {
        propMeta.validator = macroCall.arguments[0]
      }

      // Take explicit type annotation as higher priority
      const macroCallTypeParamNode = getVinePropCallTypeParams(macroCall)
      if (macroCallTypeParamNode) {
        const macroCallTypeParam = vineFileCtx.getAstNodeContent(macroCallTypeParamNode)
        propMeta.isBool = macroCallTypeParam === 'boolean'
        propMeta.typeAnnotationRaw = macroCallTypeParam
      }

      // if (propMeta.typeAnnotationRaw === 'any') {
      //   vineCompilerHooks.onWarn(
      //     vineWarn(vineFileCtx, {
      //       msg: `The default value is too complex for Vine compiler to infer its type. Please explicitly give a type paramter for IDE type check.`,
      //       location: macroCall.loc,
      //     }),
      //   )
      // }

      // Collect prop's information
      const propName = propVarIdentifier.name
      vineCompFnCtx.props[propName] = propMeta
      vineCompFnCtx.bindings[propName] = VineBindingTypes.SETUP_REF
    })
  }
}

const analyzeVineEmits: AnalyzeRunner = (
  analyzeCtx: AnalyzeCtx,
  fnItselfNode: BabelFunctionNodeTypes,
) => {
  const { vineCompFnCtx } = analyzeCtx
  let vineEmitsMacroCall: CallExpression | undefined
  let parentVarDecl: VariableDeclarator | undefined
  _breakableTraverse(fnItselfNode, {
    enter(descendant, parent) {
      if (isVineEmits(descendant)) {
        vineEmitsMacroCall = descendant
        const foundVarDeclAncestor = parent.find(ancestor => (isVariableDeclarator(ancestor.node)))
        parentVarDecl = foundVarDeclAncestor?.node as VariableDeclarator
        throw exitTraverse
      }
    },
  })
  if (!vineEmitsMacroCall) {
    return
  }
  const typeParam = vineEmitsMacroCall.typeParameters?.params[0]
  if (!typeParam) {
    return
  }

  // Save all the properties' name of
  // the typeParam (it's guranteed to be a TSTypeLiteral with all TSPropertySignature)
  // to a string array for `vineCompFn.emits`
  const emitsTypeLiteralProps = (typeParam as TSTypeLiteral).members as TSPropertySignature[]
  emitsTypeLiteralProps.forEach((prop) => {
    const propName = getTSTypeLiteralPropertySignatureName(prop)
    vineCompFnCtx.emits.push(propName)
  })

  // If `vineEmits` is inside a variable declaration,
  // save the variable name to `vineCompFn.emitsAlias`
  if (parentVarDecl) {
    vineCompFnCtx.emitsAlias = (parentVarDecl.id as Identifier).name
  }
}

const analyzeVineBindings: AnalyzeRunner = (
  analyzeCtx: AnalyzeCtx,
  fnItselfNode: BabelFunctionNodeTypes,
) => {
  const { vineFileCtx, vineCompFnCtx } = analyzeCtx
  const notContainsMacroStatements: Statement[] = []
  const fnBody = fnItselfNode.body
  if (!isBlockStatement(fnBody)) {
    return
  }
  for (const stmt of fnBody.body) {
    let hasMacroCall = false
    _breakableTraverse(stmt, (node) => {
      if (isVineMacroCallExpression(node)) {
        hasMacroCall = true
        throw exitTraverse
      }
    })
    if (!hasMacroCall) {
      notContainsMacroStatements.push(stmt)
    }
  }
  for (const stmt of notContainsMacroStatements) {
    const isAllLiteral = analyzeVineFnBodyStmtForBindings(analyzeCtx, stmt)
    if (isAllLiteral) {
      vineCompFnCtx.hoistSetupStmts.push(stmt)
    }
  }

  // Mark bindings for all user imports
  for (const [importName, {
    isType,
    isNamespace,
    isDefault,
    source,
  }] of Object.entries(vineFileCtx.userImports)) {
    if (isType) {
      continue
    }
    const isSetupConst = isNamespace
      || (isDefault && source.endsWith('.vue'))
      || source === 'vue'
    vineCompFnCtx.bindings[importName]
      = isSetupConst
        ? VineBindingTypes.SETUP_CONST
        : VineBindingTypes.SETUP_MAYBE_REF
  }

  // #32 Append all valid declarations in top level scope
  // to current VCF's bindings, helping  Vue template compiler
  // to know  how to resolve them.
  const allTopLevelDeclStmts = vineFileCtx.root.program.body
    .filter((stmt): stmt is Declaration => isDeclaration(stmt))
  for (const declStmt of allTopLevelDeclStmts) {
    if (isVineCompFnDecl(declStmt)) {
      const pickedInfos = getFunctionPickedInfos(declStmt)
      pickedInfos.forEach(({ fnName }) => {
        vineCompFnCtx.bindings[fnName] = VineBindingTypes.SETUP_CONST
      })
    }
    else if (isVariableDeclaration(declStmt)) {
      for (const decl of declStmt.declarations) {
        if (isVariableDeclarator(decl) && isIdentifier(decl.id)) {
          vineCompFnCtx.bindings[decl.id.name] = VineBindingTypes.LITERAL_CONST
        }
      }
    }
    else if (
      (
        isFunctionDeclaration(declStmt)
        || isClassDeclaration(declStmt)
      ) && declStmt.id
    ) {
      vineCompFnCtx.bindings[declStmt.id.name] = VineBindingTypes.LITERAL_CONST
    }
  }
}

const analyzeVineStyle: AnalyzeRunner = (
  { vineFileCtx, vineCompFnCtx }: AnalyzeCtx,
  fnItselfNode: BabelFunctionNodeTypes,
) => {
  let vineStyleMacroCall: CallExpression | undefined
  _breakableTraverse(fnItselfNode, (node) => {
    if (isVineStyle(node)) {
      vineStyleMacroCall = node
      throw exitTraverse
    }
  })
  // Our validation has guranteed that `vineStyle` macro call
  // has only one argument, and it maybe a string literal, a template literal,
  // or a tagged template expression.
  if (!vineStyleMacroCall) {
    return
  }
  const macroCalleeName = getVineMacroCalleeName(vineStyleMacroCall)
  const vineStyleArg = vineStyleMacroCall.arguments[0]
  if (!vineStyleArg) {
    return
  }
  const { styleLang, styleSource, range } = getVineStyleSource(
    vineStyleArg as VineStyleValidArg,
  )
  const styleMeta: VineStyleMeta = {
    lang: styleLang,
    source: styleSource,
    range,
    scoped: macroCalleeName === 'vineStyle.scoped',
    fileCtx: vineFileCtx,
    compCtx: vineCompFnCtx,
  }

  // Collect style meta
  if (vineCompFnCtx.scopeId) {
    vineFileCtx.styleDefine[vineCompFnCtx.scopeId] = styleMeta
  }
  // Collect css v-bind
  const cssvarsValueList = parseCssVars([styleSource])
  if (cssvarsValueList.length > 0) {
    !vineCompFnCtx.cssBindings && (vineCompFnCtx.cssBindings = {})
    cssvarsValueList.forEach((value) => {
      vineCompFnCtx.cssBindings![value] = hashId(`${vineCompFnCtx.fnName}__${value}`)
    })
  }
}

const analyzeVineCustomElement: AnalyzeRunner = (
  { vineCompFnCtx }: AnalyzeCtx,
  fnItselfNode: BabelFunctionNodeTypes,
) => {
  // Find if there's any `vineCustomElement` macro call exists
  _breakableTraverse(fnItselfNode, (node) => {
    if (isVineCustomElement(node)) {
      vineCompFnCtx.isCustomElement = true
      throw exitTraverse
    }
  })
}

const analyzeVineSlots: AnalyzeRunner = (
  { vineCompFnCtx },
  fnItselfNode,
) => {
  // Find if there's any `vineSlots` macro call exists
  let vineSlotsMacroCall: CallExpression | undefined
  let parentVarDecl: VariableDeclarator | undefined
  _breakableTraverse(fnItselfNode, (node, parent) => {
    if (isVineSlots(node)) {
      vineSlotsMacroCall = node
      const foundVarDeclAncestor = parent.find(ancestor => (isVariableDeclarator(ancestor.node)))
      parentVarDecl = foundVarDeclAncestor?.node as VariableDeclarator
      throw exitTraverse
    }
  })

  if (!vineSlotsMacroCall) {
    return
  }

  // Traverse vineSlots type parameter and save all the property sigantures' name and its type annotation
  const typeParam = vineSlotsMacroCall.typeParameters?.params[0]
  if (!typeParam) {
    return
  }

  const slotsTypeLiteralProps = (typeParam as TSTypeLiteral).members
  for (const prop of slotsTypeLiteralProps) {
    if (isTSPropertySignature(prop) && isIdentifier(prop.key)) {
      const fnFirstParamType
        = ((prop.typeAnnotation!.typeAnnotation as TSFunctionType | Nil)
          ?.parameters?.[0]?.typeAnnotation as TSTypeAnnotation)
          ?.typeAnnotation as TSTypeLiteral

      if (fnFirstParamType) {
        vineCompFnCtx.slots[prop.key.name] = {
          props: fnFirstParamType,
        }
      }
    }
    else if (isTSMethodSignature(prop) && isIdentifier(prop.key)) {
      const fnFirstParamType
        = (prop.parameters[0]!.typeAnnotation as TSTypeAnnotation)
          .typeAnnotation as TSTypeLiteral

      vineCompFnCtx.slots[prop.key.name] = {
        props: fnFirstParamType,
      }
    }
  }

  // find slots alias
  if (parentVarDecl && isIdentifier(parentVarDecl.id)) {
    vineCompFnCtx.slotsAlias = parentVarDecl.id.name
  }
}

const analyzeVineModel: AnalyzeRunner = (
  { vineCompFnCtx },
  fnItselfNode,
) => {
  // Find if all `vineModel` macro call exists
  const vineModelMacroCalls: Array<{
    macroCall: CallExpression
    parentVarDecl?: VariableDeclarator
  }> = []

  _breakableTraverse(fnItselfNode, (node, parent) => {
    if (isVineModel(node)) {
      const foundVarDeclAncestor = parent.find(ancestor => (isVariableDeclarator(ancestor.node)))
      vineModelMacroCalls.push({
        macroCall: node,
        parentVarDecl: foundVarDeclAncestor?.node as VariableDeclarator,
      })
    }
  })

  // Traverse all `vineModel` macro calls
  for (const { macroCall, parentVarDecl } of vineModelMacroCalls) {
    if (!parentVarDecl || !isIdentifier(parentVarDecl.id)) {
      continue
    }

    const varName = parentVarDecl.id.name

    // If the macro call has no argument,
    // - its model name is 'modelValue' as default
    // - its model modifiers name is 'modelModifiers' as default
    // - its model options is null
    if (!macroCall.arguments.length) {
      vineCompFnCtx.vineModels.modelValue = {
        varName,
        modelModifiersName: DEFAULT_MODEL_MODIFIERS_NAME,
        modelOptions: null,
      }
      continue
    }

    // If the macro call has just one argument,
    else if (macroCall.arguments.length === 1) {
      // If this argument is a string literal,
      // - it's the model name
      // - its model modifiers name is based on the model name
      // - its model options is null
      if (isStringLiteral(macroCall.arguments[0])) {
        const modelName = macroCall.arguments[0].value
        vineCompFnCtx.vineModels[modelName] = {
          varName,
          modelModifiersName: `${modelName}Modifiers`,
          modelOptions: null,
        }
      }
      // If this argument is a object literal,
      // - its model name is 'modelValue' as default
      // - its model modifiers name is 'modelModifiers' as default
      // - its model options is the object literal
      else {
        vineCompFnCtx.vineModels.modelValue = {
          varName,
          modelModifiersName: DEFAULT_MODEL_MODIFIERS_NAME,
          modelOptions: macroCall.arguments[0],
        }
      }
    }

    // If the macro call has two arguments,
    // - the first argument is the model name
    // - the second argument is the model options
    else {
      const modelName = (macroCall.arguments[0] as StringLiteral).value
      vineCompFnCtx.vineModels[modelName] = {
        varName,
        modelModifiersName: `${modelName}Modifiers`,
        modelOptions: macroCall.arguments[1],
      }
    }
  }

  // All vineModel definitions are treated as `setup-ref` bindings
  for (const [modelName, modelDef] of Object.entries(vineCompFnCtx.vineModels)) {
    vineCompFnCtx.bindings[modelName] = VineBindingTypes.PROPS
    // If `varName` is equal to `modelName`, it would be overrided to `setup-ref`
    vineCompFnCtx.bindings[modelDef.varName] = VineBindingTypes.SETUP_REF
  }

  // vineEmits is treated as `setup-const` bindings #89
  if (vineCompFnCtx.emitsAlias && vineCompFnCtx.emits.length) {
    vineCompFnCtx.bindings[vineCompFnCtx.emitsAlias] = VineBindingTypes.SETUP_CONST
  }
}

const analyzeRunners: AnalyzeRunner[] = [
  analyzeVineProps,
  analyzeVineEmits,
  analyzeVineExpose,
  analyzeVineSlots,
  analyzeVineModel,
  analyzeVineOptions,
  analyzeVineBindings,
  analyzeVineStyle,
  analyzeVineCustomElement,
]

function analyzeDifferentKindVineFunctionDecls(analyzeCtx: AnalyzeCtx) {
  const { vineCompFnCtx } = analyzeCtx
  const { fnItselfNode } = vineCompFnCtx
  if (!fnItselfNode) {
    return
  }
  analyzeRunners.forEach(exec => exec(analyzeCtx, fnItselfNode))
}

function analyzeFileImportStmts(
  vineFileCtx: VineFileCtx,
) {
  const { root } = vineFileCtx
  const fileImportStmts = getImportStatements(root)
  if (!fileImportStmts.length) {
    return
  }
  for (const importStmt of fileImportStmts) {
    const source = importStmt.source.value // remove quotes
    const isImportTypeStmt = importStmt.importKind === 'type'
    const allSpecifiers = importStmt.specifiers
    for (const spec of allSpecifiers) {
      const importMeta: VineUserImport = {
        source,
        isType: isImportTypeStmt,
      }
      if (isImportSpecifier(spec)) {
        const importedName = isStringLiteral(spec.imported)
          ? spec.imported.value
          : spec.imported.name
        const localName = spec.local.name
        if (spec.importKind === 'type') {
          // `import { type XXX }` from '...'
          importMeta.isType = true
        }
        else if (importedName === 'default') {
          // `import { default as XXX }` from '...'
          importMeta.isDefault = true
        }
        if (source === 'vue') {
          vineFileCtx.vueImportAliases[importedName] = localName || importedName
        }
        vineFileCtx.userImports[localName] = importMeta
      }
      else if (isImportNamespaceSpecifier(spec)) {
        // `import * as xxx from '...'`
        importMeta.isNamespace = true
        vineFileCtx.userImports[spec.local.name] = importMeta
      }
      else if (isImportDefaultSpecifier(spec)) {
        // `import xxx from '...'`
        importMeta.isDefault = true
        vineFileCtx.userImports[spec.local.name] = importMeta
      }

      const isUsedInTemplate = vineFileCtx.vineCompFns.some(
        vineCompFn => isImportUsed(vineCompFn, spec.local.name),
      )
      importMeta.isUsedInTemplate = isUsedInTemplate
    }
  }
  const lastImportStmt = fileImportStmts[fileImportStmts.length - 1]
  vineFileCtx.importsLastLine = lastImportStmt.loc
}

function buildVineCompFnCtx(
  vineCompilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
  vineFnInfo: VineFnPickedInfo,
) {
  // Get the function AST node itself
  // - for normal function declaration `function xxx(...) {...}`:
  //       the AST node is the declaration itself
  // - for variable function declaration
  //       - `const xxx = function(...) {...}`
  //       - `const xxx = (...) => {...}`:
  //       the AST node is the the function expression
  const { fnDeclNode, fnName, fnItselfNode } = vineFnInfo
  const {
    templateReturn,
    templateStringNode,
  } = findVineTagTemplateStringReturn(
    fnDeclNode,
  )
  const scopeId = hashId(`${vineFileCtx.fileId}:${fnName}`)
  const templateStringQuasiNode = templateStringNode?.quasi.quasis[0]
  const templateSource = templateStringQuasiNode?.value.raw ?? ''
  const vineCompFnCtx: VineCompFnCtx = {
    isExport: isExportDeclaration(fnDeclNode),
    isAsync: fnItselfNode?.async ?? false,
    isCustomElement: false,
    fnName,
    scopeId,
    fnDeclNode,
    fnItselfNode,
    templateStringNode,
    templateReturn,
    templateSource,
    propsAlias: 'props',
    emitsAlias: 'emits',
    props: {},
    emits: [],
    slots: {},
    slotsAlias: 'slots',
    vineModels: {},
    bindings: {},
    cssBindings: {},
    hoistSetupStmts: [],

    getPropsTypeRecordStr(): string {
      return `{ ${
        Object.entries(this.props).map(
          ([propName, propMeta]) => `${propName}: ${propMeta.typeAnnotationRaw}`,
        ).join(', ')
      } }`
    },
  }
  const analyzeCtx: AnalyzeCtx = {
    vineCompilerHooks,
    vineFileCtx,
    vineCompFnCtx,
  }

  // Divide the handling into two cases
  // by the kind of the function declaration
  analyzeDifferentKindVineFunctionDecls(analyzeCtx)

  return vineCompFnCtx
}

export function analyzeVine(
  vineCompilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
  vineCompFnDecls: Node[],
) {
  // Analyze all import statements in this file
  // and make a userImportAlias for key methods in 'vue', like 'ref', 'reactive'
  // in order to create binding records
  analyzeFileImportStmts(vineFileCtx)

  // Analyze all Vine component function in this file
  vineCompFnDecls.forEach(
    (vineFnCompDecl) => {
      // Get the function AST node itself
      // - for normal function declaration `function xxx(...) {...}`:
      //       the AST node is the declaration itself
      // - for variable function declaration
      //       - `const xxx = function(...) {...}`
      //       - `const xxx = (...) => {...}`:
      //       the AST node is the the function expression
      const pickedInfos = getFunctionPickedInfos(vineFnCompDecl)
      pickedInfos.forEach((vineFnInfo) => {
        vineFileCtx.vineCompFns.push(
          buildVineCompFnCtx(
            vineCompilerHooks,
            vineFileCtx,
            vineFnInfo,
          ),
        )
      })
    },
  )

  // check if there are any reference
  // to identifiers that will be hoisted.
  const makeErrorOnRefHoistedIdentifiers = (vineFnComp: VineCompFnCtx, identifiers: Identifier[]) => {
    for (const id of identifiers) {
      const binding = vineFnComp.bindings[id.name]
      if (binding && binding !== VineBindingTypes.LITERAL_CONST) {
        vineCompilerHooks.onError(
          vineWarn(vineFileCtx, {
            msg: `Cannot reference "${id.name}" locally declared variables because it will be hoisted outside of component's setup() function.`,
            location: id.loc,
          }),
        )
      }
    }
  }
  // check if there are any reference
  // to identifiers that will be hoisted.
  for (const vineFnComp of vineFileCtx.vineCompFns) {
    // In the following conditions:
    // - `vineProp`'s validator function
    const allValidatorFnBodys = Object.entries(vineFnComp.props)
      .filter(([_, propMeta]) => Boolean(propMeta.validator))
      .map(([_, propMeta]) => (
        propMeta.validator as (FunctionExpression | ArrowFunctionExpression | undefined)
      )?.body)

    for (const validatorFnBody of allValidatorFnBodys) {
      if (!validatorFnBody) {
        continue
      }
      const identifiers: Identifier[] = []
      walkIdentifiers(validatorFnBody, id => identifiers.push(id))
      makeErrorOnRefHoistedIdentifiers(vineFnComp, identifiers)
    }
    // - `vineOptions`'s argument object
    const vineOptionsArg = vineFnComp.options
    if (vineOptionsArg) {
      const identifiers: Identifier[] = []
      walkIdentifiers(vineOptionsArg, id => identifiers.push(id))
      makeErrorOnRefHoistedIdentifiers(vineFnComp, identifiers)
    }
    // - `vineModel`'s 2nd argument, its options
    if (vineFnComp.vineModels) {
      for (const { modelOptions } of Object.values(vineFnComp.vineModels)) {
        if (!modelOptions) {
          continue
        }
        const identifiers: Identifier[] = []
        walkIdentifiers(modelOptions, id => identifiers.push(id))
        makeErrorOnRefHoistedIdentifiers(vineFnComp, identifiers)
      }
    }
  }
}
