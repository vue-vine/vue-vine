import hashId from 'hash-sum'
import { parse, walkIdentifiers } from '@vue/compiler-dom'
import {
  isArrayPattern,
  isBlockStatement,
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
  isTaggedTemplateExpression,
  isTemplateLiteral,
  isVariableDeclaration,
  isVariableDeclarator,
  traverse,
} from '@babel/types'
import type {
  ArrayPattern,
  ArrowFunctionExpression,
  CallExpression,
  Declaration,
  FunctionExpression,
  Identifier, Node,
  ObjectPattern,
  Statement,
  TSPropertySignature,
  TSTypeAnnotation,
  TSTypeLiteral,
  VariableDeclaration,
  VariableDeclarator,
} from '@babel/types'
import { type BindingTypes } from '@vue/compiler-dom'
import { VineBindingTypes } from './constants'
import type {
  BabelFunctionNodeTypes,
  VINE_MACRO_NAMES,
  VineCompFnCtx,
  VineCompilerHooks,
  VineFileCtx,
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
  getFunctionInfo,
  getFunctionParams,
  getImportStatments,
  getTSTypeLiteralPropertySignatureName,
  getVineMacroCalleeName,
  isCallOf,
  isStaticNode,
  isVineCompFnDecl,
  isVineMacroCallExpression,
  isVineMacroOf,
} from './babel-helpers/ast'
import { parseCssVars } from './style/analyze-css-vars'
import { isImportUsed } from './template/importUsageCheck'
import { vineWarn } from './diagnostics'

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
    traverse(fnItselfNode, {
      enter(descendant) {
        if (isVineMacroOf(macroName)(descendant)) {
          vineExposeMacroCall = descendant
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
  { vineCompFnCtx, vineFileCtx },
  fnItselfNode,
) => {
  const formalParams = getFunctionParams(fnItselfNode)
  if (formalParams.length === 1) {
    // The Vine validator has guranateed there's only one formal params,
    // its type is `identifier`, and it must have an object literal type annotation.
    // Save this parameter's name as `propsAlias`
    const propsFormalParam = (formalParams[0] as Identifier)
    const propsTypeAnnotation = ((propsFormalParam.typeAnnotation as TSTypeAnnotation).typeAnnotation as TSTypeLiteral)
    vineCompFnCtx.propsAlias = propsFormalParam.name;
    // Analyze the object literal type annotation
    // and save the props info into `vineCompFnCtx.props`
    (propsTypeAnnotation.members as TSPropertySignature[]).forEach((member) => {
      const propName = (member.key as Identifier).name
      const propType = vineFileCtx.fileSourceCode.slice(
        member.typeAnnotation!.typeAnnotation.start!,
        member.typeAnnotation!.typeAnnotation.end!,
      )
      const propMeta: VinePropMeta = {
        isFromMacroDefine: false,
        isRequired: member.optional === undefined ? true : !member.optional,
        isBool: propType === 'boolean',
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
      }
      const macroCallTypeParamNode = macroCall.typeParameters?.params[0]
      if (macroCallTypeParamNode) {
        const macroCallTypeParam = vineFileCtx.fileSourceCode.slice(
          macroCallTypeParamNode.start!,
          macroCallTypeParamNode.end!,
        )
        propMeta.isBool = macroCallTypeParam === 'boolean'
      }
      if (macroCalleeName === 'vineProp.withDefault') {
        propMeta.default = macroCall.arguments[0]
        propMeta.validator = macroCall.arguments[1]
      }
      else {
        propMeta.validator = macroCall.arguments[0]
      }

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
  traverse(fnItselfNode, {
    enter(descendant, parent) {
      if (isVineMacroOf('vineEmits')(descendant)) {
        vineEmitsMacroCall = descendant
        const foundVarDeclAncestor = parent.find(ancestor => (isVariableDeclarator(ancestor.node)))
        parentVarDecl = foundVarDeclAncestor?.node as VariableDeclarator
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
    traverse(stmt, (node) => {
      if (hasMacroCall) {
        return
      }
      if (isVineMacroCallExpression(node)) {
        hasMacroCall = true
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
      const { fnName } = getFunctionInfo(declStmt)
      vineCompFnCtx.bindings[fnName] = VineBindingTypes.SETUP_CONST
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
  traverse(fnItselfNode, (node) => {
    if (isVineMacroOf('vineStyle')(node)) {
      vineStyleMacroCall = node
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
  traverse(fnItselfNode, (node) => {
    if (isVineMacroOf('vineCustomElement')(node)) {
      vineCompFnCtx.isCustomElement = true
    }
  })
}

const analyzeRunners: AnalyzeRunner[] = [
  analyzeVineProps,
  analyzeVineEmits,
  analyzeVineExpose,
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
  const fileImportStmts = getImportStatments(root)
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
  fnDeclNode: Node,
) {
  // Get the function AST node itself
  // - for normal function declaration `function xxx(...) {...}`:
  //       the AST node is the declaration itself
  // - for variable function declaration
  //       - `const xxx = function(...) {...}`
  //       - `const xxx = (...) => {...}`:
  //       the AST node is the the function expression
  const { fnName, fnItselfNode } = getFunctionInfo(fnDeclNode)
  const {
    templateReturn,
    templateStringNode,
  } = findVineTagTemplateStringReturn(
    fnDeclNode,
  )
  const scopeId = hashId(`${vineFileCtx.fileId}:${fnName}`)
  const templateSource = templateStringNode?.quasi.quasis[0].value.raw ?? ''
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
    templateAst: parse(templateSource),
    propsAlias: 'props',
    emitsAlias: 'emits',
    props: {},
    emits: [],
    bindings: {},
    cssBindings: {},
    hoistSetupStmts: [],
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
      vineFileCtx.vineCompFns.push(
        buildVineCompFnCtx(
          vineCompilerHooks,
          vineFileCtx,
          vineFnCompDecl,
        ),
      )
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
            msg: `Cannot reference "${id.name}" locally declared variables because it will be hoisted outside of the setup() function.`,
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
        propMeta.validator as (FunctionExpression | ArrowFunctionExpression)
      ).body)

    for (const validatorFnBody of allValidatorFnBodys) {
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
  }
}
