import type { NapiConfig, SgNode } from '@ast-grep/napi'
import { ts } from '@ast-grep/napi'
import hashId from 'hash-sum'
import type { VineCompilerHooks, VineFileCtx, VineFnCompCtx, VinePropMeta, VineStyleLang, VineStyleMeta, VineUserImport } from './types'
import { VineBindingTypes } from './types'
import { BOOL_KINDS, TS_NODE_KINDS, VINE_PROP_OPTIONAL_CALL, VINE_PROP_WITH_DEFAULT_CALL, VINE_STYLE_SCOPED_CALL } from './constants'
import { ruleHasMacroCallExpr, ruleIdInsideMacroMayReferenceSetupLocal, ruleImportClause, ruleImportNamespace, ruleImportSpecifier, ruleImportStmt, ruleTopLevelDeclarationNames, ruleValidVinePropDeclaration, ruleVineCECall, ruleVineEmitsCall, ruleVineEmitsDeclaration, ruleVineExposeCall, ruleVineFunctionComponentMatching, ruleVineOptionsCall, ruleVinePropValidatorFnBody, ruleVineStyleCall, ruleVineTaggedTemplateString } from './ast-grep/rules-for-script'
import { vineWarn } from './diagnostics'
import { parseCssVars } from './style/analyze-css-vars'
import { isNotUselessPunc } from './utils'

type AnalyzeCtx = [
  compilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
  vineFnCompCtx: VineFnCompCtx,
]
type VineFnCompDeclKind = 'function_declaration' | 'lexical_declaration'
const reservingKindsForSetup = [
  'lexical_declaration',
  'function_declaration',
  'expression_statement',
  'class_declaration',
  'abstract_class_declaration',
  'interface_declaration',
]

function analyzeFileImportStmts(
  analyzeCtx: AnalyzeCtx,
) {
  const [,fileCtx] = analyzeCtx
  const { sgRoot } = fileCtx
  const fileImportStmts = sgRoot.findAll(ruleImportStmt)
  if (!fileImportStmts.length) {
    return
  }
  for (const importStmt of fileImportStmts) {
    const source = importStmt
      .field('source')!
      .text()
      .slice(1, -1) // remove quotes
    const isImportTypeStmt = Boolean(importStmt.child(1)?.text() === 'type')
    const allImportClauses = importStmt.findAll(ruleImportClause)
    for (const importClause of allImportClauses) {
      const importMeta: VineUserImport = {
        source,
        isType: isImportTypeStmt,
      }
      const allImportSpecs = importClause.findAll(ruleImportSpecifier)
      // Named import: shape like `import { xxx } from '...'`
      for (const importSpec of allImportSpecs) {
        const importSpecFirstChild = importSpec.child(0)
        const importName = importSpec.field('name')!.text()
        const importAlias = importSpec.field('alias')?.text()
        if (importSpecFirstChild?.text() === 'type' && importSpecFirstChild?.kind() !== 'identifier') {
          // `import { type XXX }` from '...'
          importMeta.isType = true
          fileCtx.userImports[importName] = importMeta
          continue
        }
        if (importName === 'default') {
          // `import { default (as xxx)? }` from '...'
          importMeta.isDefault = true
        }
        if (source === 'vue') {
          fileCtx.vueImportAliases[importName] = importAlias ?? importName
        }
        fileCtx.userImports[importAlias ?? importName] = importMeta
      }

      // Namespace import: shape like `import * as xxx from '...'`
      const importNamespace = importClause.find(ruleImportNamespace)
      if (importNamespace) {
        const importName = importNamespace.find(ts.kind('identifier'))!.text()
        importMeta.isNamespace = true
        fileCtx.userImports[importName] = importMeta
        continue
      }

      // Default import: shape like `import xxx from '...'`
      const isImportDefault = importClause.child(0)!.kind() === 'identifier'
      if (isImportDefault) {
        const importNameNode = importClause.child(0)!
        importMeta.isDefault = true
        fileCtx.userImports[importNameNode.text()] = importMeta
      }
    }
  }
  const lastImportStmt = fileImportStmts[fileImportStmts.length - 1]
  fileCtx.importsLastLine = lastImportStmt.range().end
}

function setViteFnCompName(
  vineFileCtx: VineFileCtx,
  vineFnCompCtx: VineFnCompCtx,
  name: string,
) {
  vineFnCompCtx.fnName = name
  vineFnCompCtx.scopeId = hashId(
    `${vineFileCtx.fileId}:${name}`,
  )
}

function analyzeVinePropsByFormalParams(
  [,,vineFnCompCtx]: AnalyzeCtx,
  vineFnCompSgNode: SgNode,
) {
  const vineFnParamsSgNode = vineFnCompSgNode.field('parameters')!
  if (vineFnParamsSgNode.text() === '()') {
    // No parameter, skip
    return
  }
  const propsAsFirstParamSgNode = vineFnParamsSgNode.children().slice(1, -1)[0] // Skip first and last parenthesis

  // Save this parameter's name as `propsAlias`
  const paramPatternNode = propsAsFirstParamSgNode.field('pattern')!
  if (paramPatternNode.kind() === 'identifier') {
    vineFnCompCtx.propsAlias = paramPatternNode.text()
  }

  // Our validation has already guaranteed that the first parameter is an object type
  const propsObjectTypeSgNode = propsAsFirstParamSgNode.field('type')!.child(1)! // Skip the ':' token
  // Traverse all properties of the object type
  propsObjectTypeSgNode
    .children()
    .filter(child => child.kind() === 'property_signature')
    .forEach((propertySignature) => {
      const propName = propertySignature.field('name')!.text()
      const propMeta: VinePropMeta = {
        isFromMacroDefine: false,
        isRequired: true,
        isBool: propertySignature.child(1)?.text() === '?' ?? false,
      }

      vineFnCompCtx.props[propName] = propMeta
      vineFnCompCtx.bindings[propName] = VineBindingTypes.PROPS
    })
}

function analyzeVinePropsByMacroCall(
  [,,vineFnCompCtx]: AnalyzeCtx,
  vineFnCompSgNode: SgNode,
) {
  const allVinePropDecls = vineFnCompSgNode.findAll(ruleValidVinePropDeclaration)
  if (allVinePropDecls.length === 0) {
    // No vineProp call, skip
    return
  }
  for (const vinePropLexicalDecl of allVinePropDecls) {
    const vinePropDecl = vinePropLexicalDecl.children().find(
      child => child.kind() === 'variable_declarator'
        && child.field('value')!.field('function')!.text().includes('vineProp'),
    )!
    const propName = vinePropDecl.field('name')!.text()
    const vinePropCallSgNode = vinePropDecl.field('value')!
    const vinePropCalleeSgNode = vinePropCallSgNode.field('function')!
    const isOptional = vinePropCalleeSgNode.text() === VINE_PROP_OPTIONAL_CALL
    const isWithDefault = vinePropCalleeSgNode.text() === VINE_PROP_WITH_DEFAULT_CALL
    const vinePropCallArgs = vinePropCallSgNode.field('arguments')!.children().slice(1, -1) // Skip parenthesis

    // Our validation has guaranteed that `vineProp` must have a type argument
    const isBool = isWithDefault
      ? BOOL_KINDS.includes(vinePropCallArgs[0].kind())
      : vinePropCallSgNode.field('type_arguments')?.child(1)!.text() === 'boolean' ?? false
    const propMeta: VinePropMeta = {
      isFromMacroDefine: true,
      isRequired: !isOptional,
      isBool,
    }

    if (isWithDefault) {
      const [defaultValueNode, validatorFnNode] = vinePropCallArgs
      propMeta.default = defaultValueNode
      propMeta.validator = validatorFnNode
    }
    else if (vinePropCallArgs[0]) {
      propMeta.validator = vinePropCallArgs[0]
    }

    // Collect prop's information
    vineFnCompCtx.props[propName] = propMeta
    vineFnCompCtx.bindings[propName] = VineBindingTypes.SETUP_REF
  }
}

function analyzeVineFunctionEmits(
  [,,vineFnCompCtx]: AnalyzeCtx,
  vineFnCompSgNode: SgNode,
) {
  // Our validation has already guaranteed that vine function's inside `vineEmits` is valid
  const vineEmitsSgNode = vineFnCompSgNode.find(ruleVineEmitsCall)
  if (!vineEmitsSgNode) {
    // No vineEmits, skip
    return
  }
  const vineEmitsTypeArgs = vineEmitsSgNode.field('type_arguments')
  const emitTypeObjLiteralNode = vineEmitsTypeArgs!.child(0)!
  // Get all properties' name of the object type literal
  emitTypeObjLiteralNode
    .children()
    .filter(child => child.kind() === 'property_signature')
    .forEach((propertySignature) => {
      const emitName = propertySignature.field('name')!.text()
      vineFnCompCtx.emits.push(emitName)
    })

  // Find the user defined emits variable name
  const vineEmitsDeclaration = vineFnCompSgNode.find(ruleVineEmitsDeclaration)
  if (vineEmitsDeclaration) {
    vineFnCompCtx.emitsAlias = vineEmitsDeclaration.field('name')!.text()
  }
}

function anaylyzeStoreTheOnlyOneArg(
  vineFnCompSgNode: SgNode,
  findCallRule: NapiConfig,
) {
  const exposeCallSgNode = vineFnCompSgNode.find(findCallRule)
  if (!exposeCallSgNode) {
    // No vineExpose call, skip
    return
  }
  // Our validation has already guaranteed that the first argument is an object type.
  const exposeCallArg = exposeCallSgNode
    .field('arguments')!.children()
    .filter(isNotUselessPunc)[0]!
  // As compilation, we just need to store the argument source code
  return exposeCallArg
}

function analyzeVineExpose(
  [,,vineFnCompCtx]: AnalyzeCtx,
  vineFnCompSgNode: SgNode,
) {
  vineFnCompCtx.expose = anaylyzeStoreTheOnlyOneArg(vineFnCompSgNode, ruleVineExposeCall)
}

function analyzeVineOptions(
  [,,vineFnCompCtx]: AnalyzeCtx,
  vineFnCompSgNode: SgNode,
) {
  vineFnCompCtx.options = anaylyzeStoreTheOnlyOneArg(vineFnCompSgNode, ruleVineOptionsCall)
}

function getStyleSource(
  vineStyleCallArg: SgNode,
): [sourceNode: SgNode, tag: VineStyleLang] {
  if (vineStyleCallArg.kind() === 'string'
    || vineStyleCallArg.kind() === 'template_string'
  ) {
    return [
      vineStyleCallArg,
      'css',
    ]
  }
  // Our validation has already guaranteed that
  // if it's not a string or template string, it must be an tagged template expression
  const cssLangName = vineStyleCallArg.field('function')!.text()
  const taggedTemplateString = vineStyleCallArg.field('arguments')!
  return [
    taggedTemplateString,
    cssLangName as VineStyleLang,
  ]
}

function analyzeVineStyle(
  [,fileCtx, vineFnCompCtx]: AnalyzeCtx,
  vineFnCompSgNode: SgNode,
) {
  const vineStyleCall = vineFnCompSgNode.find(ruleVineStyleCall)
  if (!vineStyleCall) {
    // No vineStyle call, skip
    return
  }
  const vineStyleCallee = vineStyleCall.field('function')!
  const vineStyleCallArg = vineStyleCall.field('arguments')!.children().slice(1, -1)[0]! // Skip the parentheses
  const [sourceNode, lang] = getStyleSource(vineStyleCallArg)
  const styleMeta: VineStyleMeta = {
    lang,
    source: sourceNode.text().slice(1, -1), // Remove the quotes,
    range: sourceNode.range(),
    scoped: false,
    fileCtx,
  }
  if (vineStyleCallee.text() === VINE_STYLE_SCOPED_CALL) {
    styleMeta.scoped = true
  }

  // Collect style meta
  if (vineFnCompCtx.scopeId) {
    fileCtx.styleDefine[vineFnCompCtx.scopeId] = styleMeta
  }

  // Collect css v-bind
  const cssContent = sourceNode.text()
  const cssvarsValueList = parseCssVars([cssContent])
  if (cssvarsValueList.length > 0) {
    !vineFnCompCtx.cssBindings && (vineFnCompCtx.cssBindings = {})
    cssvarsValueList.forEach((value) => {
      vineFnCompCtx.cssBindings![value] = hashId(vineFnCompCtx.fnName + value)
    })
  }
}

function isLiteralNode(node: SgNode | null) {
  switch (node?.kind()) {
    case 'number':
    case 'string':
    case 'true':
    case 'false':
    case 'array':
    case 'object':
      return true
    default:
      return false
  }
}

function isStaticSgNode(node: SgNode): boolean {
  switch (node.kind()) {
    case 'unary_expression': // void 0, !true
      return isStaticSgNode(node.field('argument')!)
    case 'binary_expression':
    case 'sequence_expression':
      return isStaticSgNode(node.field('left')!) && isStaticSgNode(node.field('right')!)
    case 'ternary_expression':
      return (
        isStaticSgNode(node.field('condition')!)
        && isStaticSgNode(node.field('consequence')!)
        && isStaticSgNode(node.field('alternative')!)
      )
    case 'template_string':
      return node.children().every((templateSubstitution) => {
        return isStaticSgNode(templateSubstitution.child(0)!)
      })
    case 'parenthesized_expression':
    case 'non_null_expression':
    case 'as_expression':
      return isStaticSgNode(node.child(0)!)
    case 'type_assertion':
      return isStaticSgNode(node.child(1)!)

    default:
      if (isLiteralNode(node)) {
        return true
      }
      return false
  }
}

function unwrapTSNode(node: SgNode): SgNode {
  if (TS_NODE_KINDS.includes(node.kind())) {
    switch (node.kind()) {
      case 'as_expression':
      case 'non_null_expression':
      case 'satisfies_expression':
        return unwrapTSNode(node.child(0)!)
      case 'type_assertion':
        return unwrapTSNode(
          node.child(node.children().length - 1)!,
        )
      default:
        // Todo: handle TSInstantiationExpression
        return node
    }
  }
  else {
    return node
  }
}

function isCallOf(
  node: SgNode | null,
  test: string | ((id: string) => boolean) | null | undefined,
) {
  return Boolean(
    node
    && test
    && node.kind() === 'call_expression'
    && node.field('function')!.kind() === 'identifier'
    && (
      typeof test === 'string'
        ? node.field('function')!.text() === test
        : test(node.field('function')!.text())
    ),
  )
}

function canNeverBeRef(
  node: SgNode | null,
  userReactiveAlias?: string,
): boolean {
  if (isCallOf(node, userReactiveAlias)) {
    return true
  }
  // TaggedTemplateExpression
  if (
    node?.kind() === 'call_expression'
    && node.field('arguments')?.kind() === 'template_string'
  ) {
    return true
  }
  switch (node?.kind()) {
    case 'unary_expression':
    case 'binary_expression':
    case 'array':
    case 'object':
    case 'arrow_function':
    case 'update_expression':
    case 'class':
      return true
    case 'sequence_expression':
      return canNeverBeRef(node.field('right')!, userReactiveAlias)
    default:
      if (isLiteralNode(node)) {
        return true
      }
      return false
  }
}

function walkObjectPattern(
  analyzeCtx: AnalyzeCtx,
  node: SgNode,
  isConst: boolean,
) {
  const [,,vineFnCompCtx] = analyzeCtx
  for (const childNode of node.children().filter(isNotUselessPunc)) {
    if (childNode.kind() === 'shorthand_property_identifier_pattern') {
      const type = isConst
        ? VineBindingTypes.SETUP_MAYBE_REF
        : VineBindingTypes.SETUP_LET
      vineFnCompCtx.bindings[childNode.text()] = type
    }
    if (childNode.kind() === 'pair_pattern') {
      walkPattern(analyzeCtx, childNode.field('value')!, isConst)
    }
    else if (childNode.kind() === 'rest_pattern') {
      const rest = childNode.child(1)!
      if (rest.kind() === 'identifier') {
        // ...rest
        // argument can only be identifier when destructuring
        const type = isConst ? VineBindingTypes.SETUP_CONST : VineBindingTypes.SETUP_LET
        vineFnCompCtx.bindings[rest.text()] = type
      }
    }
  }
}

function walkArrayPattern(
  analyzeCtx: AnalyzeCtx,
  node: SgNode,
  isConst: boolean,
) {
  for (const childNode of node.children().filter(isNotUselessPunc)) {
    childNode && walkPattern(analyzeCtx, childNode, isConst)
  }
}

function walkPattern(
  analyzeCtx: AnalyzeCtx,
  node: SgNode,
  isConst: boolean,
  isDefineCall = false,
) {
  const [,,vineFnCompCtx] = analyzeCtx
  if (node.kind() === 'identifier') {
    const type = isDefineCall
      ? VineBindingTypes.SETUP_CONST
      : isConst
        ? VineBindingTypes.SETUP_MAYBE_REF
        : VineBindingTypes.SETUP_LET
    vineFnCompCtx.bindings[node.text()] = type
  }
  else if (node.kind() === 'rest_pattern' && node.child(1)!.kind() === 'identifier') {
    // argument can only be identifier when destructuring
    const type = isConst ? VineBindingTypes.SETUP_CONST : VineBindingTypes.SETUP_LET
    vineFnCompCtx.bindings[node.child(1)!.text()] = type
  }
  else if (node.kind() === 'object_pattern') {
    walkObjectPattern(analyzeCtx, node, isConst)
  }
  else if (node.kind() === 'array_pattern') {
    walkArrayPattern(analyzeCtx, node, isConst)
  }
  else if (node.kind() === 'assignment_pattern') {
    const assignLeft = node.field('left')!
    if (assignLeft.kind() === 'identifier') {
      const type = isConst
        ? VineBindingTypes.SETUP_MAYBE_REF
        : VineBindingTypes.SETUP_LET
      vineFnCompCtx.bindings[assignLeft.text()] = type
    }
    else {
      walkPattern(analyzeCtx, assignLeft, isConst)
    }
  }
}

function analyzeLexicalDeclNode(
  analyzeCtx: AnalyzeCtx,
  lexicalDeclNode: SgNode,
) {
  const [,vineFileCtx, vineFnCompCtx] = analyzeCtx
  const [kind] = lexicalDeclNode.children()
  const allDeclarators = lexicalDeclNode
    .children().slice(1)
    .filter(isNotUselessPunc)

  const userImportAliases = {
    ...vineFileCtx.vueImportAliases,
  }
  const userReactiveAlias = userImportAliases.reactive
  const isConst = kind.text() === 'const'
  const isAllLiteral = isConst
    && allDeclarators.every(
      decl => decl.field('name')!.kind() === 'identifier' && isStaticSgNode(decl.field('value')!),
    )
  let bindingType
  for (const varDeclarator of allDeclarators) {
    const varNameNode = varDeclarator.field('name')!
    const declValueNode = unwrapTSNode(varDeclarator.field('value')!)
    if (varNameNode.kind() === 'identifier') {
      if (isAllLiteral || (isConst && isStaticSgNode(declValueNode))) {
        bindingType = VineBindingTypes.LITERAL_CONST
      }
      else if (isCallOf(declValueNode, userReactiveAlias)) {
        // treat reactive() calls as let since it's meant to be mutable
        bindingType = isConst
          ? VineBindingTypes.SETUP_REACTIVE_CONST
          : VineBindingTypes.SETUP_LET
      }
      else if (
        // if a declaration is a const literal, we can mark it so that
        // the generated render fn code doesn't need to unref() it
        isConst && canNeverBeRef(declValueNode, userReactiveAlias)
      ) {
        bindingType = VineBindingTypes.SETUP_CONST
      }
      else if (isConst) {
        if (
          isCallOf(
            declValueNode,
            id =>
              id === userImportAliases.ref
              || id === userImportAliases.computed
              || id === userImportAliases.shallowRef
              || id === userImportAliases.customRef
              || id === userImportAliases.toRef,
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
      vineFnCompCtx.bindings[varNameNode.text()] = bindingType
    }
    else {
      // Maybe desctruing or array pattern
      if (varNameNode.kind() === 'object_pattern') {
        walkObjectPattern(analyzeCtx, varNameNode, isConst)
      }
      else if (varNameNode.kind() === 'array_pattern') {
        walkArrayPattern(analyzeCtx, varNameNode, isConst)
      }
    }
  }

  return isAllLiteral
}

function analyzeEnumDeclNode(
  [,,vineFnCompCtx]: AnalyzeCtx,
  enumDeclNode: SgNode,
) {
  const isAllLiteral = enumDeclNode
    .children()
    .filter(isNotUselessPunc)
    .every((c) => {
      return c.kind() === 'property_identifier'
        || (
          c.kind() === 'enum_assignment'
          && isStaticSgNode(c.field('value')!)
        )
    })

  const enumNameNode = enumDeclNode.field('name')!
  if (enumNameNode.kind() === 'identifier') {
    vineFnCompCtx.bindings[enumNameNode.text()] = isAllLiteral
      ? VineBindingTypes.LITERAL_CONST
      : VineBindingTypes.SETUP_CONST
  }

  return isAllLiteral
}

function analyzeVineFnBodyStmtForBindings(
  analyzeCtx: AnalyzeCtx,
  stmtNode: SgNode,
) {
  const [,,vineFnCompCtx] = analyzeCtx
  let isAllLiteral = false
  switch (stmtNode.kind()) {
    case 'lexical_declaration':
      isAllLiteral = analyzeLexicalDeclNode(analyzeCtx, stmtNode)
      break
    case 'enum_declaration':
      isAllLiteral = analyzeEnumDeclNode(analyzeCtx, stmtNode)
      break
    case 'class_declaration':
    case 'function_declaration': {
      const nameField = stmtNode.field('name')!
      if (nameField.kind() === 'identifier') {
        vineFnCompCtx.bindings[nameField.text()] = VineBindingTypes.SETUP_CONST
      }
      break
    }
    default:
      break
  }

  // Collect function body statements
  vineFnCompCtx.setupStmts.push(stmtNode)
  return isAllLiteral
}

function filterStatementWithoutMacroCall(
  _: AnalyzeCtx,
  stmts: SgNode[],
) {
  return stmts.filter((stmt) => {
    if (!reservingKindsForSetup.includes(stmt.kind())) {
      return false
    }
    if (stmt.findAll(ruleHasMacroCallExpr).length > 0) {
      return false
    }
    return true
  })
}

function analyzeVineBindings(
  analyzeCtx: AnalyzeCtx,
  fnItselfSgNode: SgNode,
) {
  const [,fileCtx, vineFnCompCtx] = analyzeCtx
  const fnBodyStmtBlockNode = fnItselfSgNode.field('body')!
  const noMacroCallStmts = filterStatementWithoutMacroCall(
    analyzeCtx,
    fnBodyStmtBlockNode.children(),
  )
  for (const stmt of noMacroCallStmts) {
    const isAllLiteral = analyzeVineFnBodyStmtForBindings(analyzeCtx, stmt)
    ;(
      isAllLiteral
        ? vineFnCompCtx.hoistSetupStmts
        : vineFnCompCtx.insideSetupStmts
    ).push(stmt)
  }
  for (const [importName, {
    isType,
    isNamespace,
    isDefault,
    source,
  }] of Object.entries(fileCtx.userImports)) {
    if (isType) {
      continue
    }
    const isSetupConst = isNamespace
      || (isDefault && source.endsWith('.vue'))
      || source === 'vue'
    vineFnCompCtx.bindings[importName]
      = isSetupConst
        ? VineBindingTypes.SETUP_CONST
        : VineBindingTypes.SETUP_MAYBE_REF
  }

  // #32 Append all valid declarations in top level scope
  // to current VCF's bindings, as LITERAL_CONST, telling the
  // Vue template compiler to remain them as is.
  const allTopLevelDeclNames = fileCtx.sgRoot.findAll(ruleTopLevelDeclarationNames)
  for (const declName of allTopLevelDeclNames) {
    vineFnCompCtx.bindings[declName.text()] = VineBindingTypes.LITERAL_CONST
  }
}

function analyzeVineCE(
  analyzeCtx: AnalyzeCtx,
  fnItselfSgNode: SgNode,
) {
  const [,, vineFnCompCtx] = analyzeCtx
  if (fnItselfSgNode.find(ruleVineCECall)) {
    vineFnCompCtx.isVineCE = true
  }
}

function analyzeDifferentKindVineFunctionDecls(
  allCtx: AnalyzeCtx,
  declSgNode: SgNode,
  vineFnDeclKind: VineFnCompDeclKind,
) {
  const [, fileCtx, vineFnCompCtx] = allCtx

  // 1. Set vineFnCompCtx.name and compute scopeId as well
  setViteFnCompName(
    fileCtx,
    vineFnCompCtx,
    vineFnDeclKind === 'function_declaration'
      ? declSgNode.field('name')!.text()
      : declSgNode.child(1)!.field('name')!.text(),
  )

  // 2. get the function AST node itself
  // - 2.1 for normal function declaration `function xxx(...) {...}`:
  //       the AST node is the `declSgNode` itself
  // - 2.2 for variable function declaration
  //       - `const xxx = function(...) {...}`
  //       - `const xxx = (...) => {...}`:
  //       the AST node is the `varDeclSgNode`'s `value` field
  const fnItselfSgNode = vineFnDeclKind === 'function_declaration'
    ? declSgNode
    : declSgNode.child(1)!.field('value')!

  const isAsync = fnItselfSgNode.child(0)?.text() === 'async'
  if (isAsync) {
    vineFnCompCtx.isAsync = true
  }

  [
    analyzeVinePropsByFormalParams,
    analyzeVinePropsByMacroCall,
    analyzeVineFunctionEmits,
    analyzeVineExpose,
    analyzeVineOptions,
    analyzeVineBindings,
    analyzeVineCE,
    analyzeVineStyle,
  ].forEach(fn => fn(allCtx, fnItselfSgNode))
}

function buildVineFnCompCtx(
  [compilerHooks, vineFileCtx]: [VineCompilerHooks, VineFileCtx],
  vineFnSgNode: SgNode,
): VineFnCompCtx {
  // Check if it's an export statement
  const vineFnTopNodekind = vineFnSgNode.kind()
  const isExport = vineFnTopNodekind === 'export_statement'
  const vineFnCompDecl = vineFnSgNode.find(ruleVineFunctionComponentMatching)!

  // Get vine template source
  const vineTemolateSgNode = vineFnCompDecl.find(ruleVineTaggedTemplateString)!.field('arguments')!
  const vineFnCompCtx: VineFnCompCtx = {
    isExport,
    isAsync: false,
    fnName: '',
    scopeId: '',
    propsAlias: 'props',
    emitsAlias: 'emits',
    props: {},
    emits: [],
    bindings: {},
    setupStmts: [],
    hoistSetupStmts: [],
    insideSetupStmts: [],
    fnDeclNode: vineFnSgNode,
    fnValueNode: vineFnCompDecl,
    template: vineTemolateSgNode,
    cssBindings: null,
    isVineCE: false,
  }

  const analyzeCtx: AnalyzeCtx = [compilerHooks, vineFileCtx, vineFnCompCtx]

  // Analyze all import statements in this file
  // and make a userImportAlias for key methods in 'vue', like 'ref', 'reactive'
  // in order to create binding records
  analyzeFileImportStmts(analyzeCtx)

  // Divide the handling into two cases
  // by the kind of the function declaration
  analyzeDifferentKindVineFunctionDecls(
    analyzeCtx,
    vineFnCompDecl,
    vineFnCompDecl.kind() as VineFnCompDeclKind,
  )

  return vineFnCompCtx
}

export function analyzeVine(
  extendsCtx: [VineCompilerHooks, VineFileCtx],
  vineFnCompDecls: SgNode[],
) {
  const [compilerHooks, vineFileCtx] = extendsCtx

  for (const vineFn of vineFnCompDecls) {
    const vineFnCompCtx = buildVineFnCompCtx(extendsCtx, vineFn)
    vineFileCtx.vineFnComps.push(vineFnCompCtx)
  }

  const makeErrorOnRefHoistedIdentifiers = (vineFnComp: VineFnCompCtx, identifiers: SgNode[]) => {
    for (const id of identifiers) {
      if (vineFnComp.bindings[id.text()] === VineBindingTypes.LITERAL_CONST) {
        compilerHooks.onWarn(
          vineWarn(vineFileCtx, {
            msg: `Cannot reference ${id.text()} in a vineProp validator function because it is declared outside the setup() function.`,
            range: id.range(),
          }),
        )
      }
    }
  }
  // check if there are any reference
  // to identifiers that will be hoisted.
  for (const vineFnComp of vineFileCtx.vineFnComps) {
    // In the following 3 conditions:
    // - `vineProp`'s validator function
    const allValidatorFnBody = vineFnComp.fnValueNode.findAll(ruleVinePropValidatorFnBody)
    for (const body of allValidatorFnBody) {
      const identifiers = body.findAll(ts.kind('identifier'))
      makeErrorOnRefHoistedIdentifiers(vineFnComp, identifiers)
    }
    // - `vineOptions`'s argument object
    // - `vineExpose`'s argument object
    const idInsideMayRefLocalMacro = vineFnComp.fnValueNode.findAll(ruleIdInsideMacroMayReferenceSetupLocal)
    makeErrorOnRefHoistedIdentifiers(vineFnComp, idInsideMayRefLocalMacro)
  }
}
