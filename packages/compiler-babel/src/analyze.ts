import hashId from 'hash-sum'
import {
  isExportDeclaration,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isStringLiteral,
} from '@babel/types'
import type {
  Identifier, Node,
  TSPropertySignature,
  TSTypeAnnotation,
  TSTypeLiteral,
} from '@babel/types'
import {
  type BabelFunctionNodeTypes,
  VineBindingTypes,
  type VineCompFnCtx,
  type VineCompilerHooks,
  type VineFileCtx,
  type VinePropMeta,
  type VineUserImport,
} from './types'
import { getFunctionInfo, getFunctionParams, getImportStatments, getVineTagTemplateStringNode } from './babel-ast'

interface AnalyzeCtx {
  vineCompilerHooks: VineCompilerHooks
  vineFileCtx: VineFileCtx
  vineCompFnCtx: VineCompFnCtx
}

type AnalyzeRunner = (
  analyzeCtx: AnalyzeCtx,
  fnItselfNode: BabelFunctionNodeTypes,
) => void

const analyzeVinePropsByFormalParam: AnalyzeRunner = (
  { vineCompFnCtx, vineFileCtx },
  fnItselfNode,
) => {
  const formalParams = getFunctionParams(fnItselfNode)
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

const analyzeRunners: AnalyzeRunner[] = [
  analyzeVinePropsByFormalParam,
]

function analyzeDifferentKindVineFunctionDecls(analyzeCtx: AnalyzeCtx) {
  const { vineCompFnCtx } = analyzeCtx
  const { fnItselfNode } = vineCompFnCtx
  if (!fnItselfNode) {
    return
  }
  analyzeRunners.forEach(exec => exec(analyzeCtx, fnItselfNode))
}

function analyzeFileImportStmts({ vineFileCtx }: AnalyzeCtx) {
  const { root } = vineFileCtx
  const fileImportStmts = getImportStatments(root)
  if (!fileImportStmts.length) {
    return
  }
  for (const importStmt of fileImportStmts) {
    const source = importStmt.source.value.slice(1, -1) // remove quotes
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
  const templateNode = getVineTagTemplateStringNode(fnDeclNode)
  const scopeId = hashId(`${vineFileCtx.fileId}:${fnName}`)
  const vineCompFnCtx: VineCompFnCtx = {
    isExport: isExportDeclaration(fnDeclNode),
    isAsync: fnItselfNode?.async ?? false,
    isCustomElement: false,
    fnName,
    scopeId,
    fnDeclNode,
    fnItselfNode,
    templateNode,
    propsAlias: 'props',
    emitsAlias: 'emits',
    props: {},
    emits: [],
    bindings: {},
    cssBindings: {},
    setupStmts: [],
    hoistSetupStmts: [],
    insideSetupStmts: [],
  }
  const analyzeCtx: AnalyzeCtx = {
    vineCompilerHooks,
    vineFileCtx,
    vineCompFnCtx,
  }

  // Analyze all import statements in this file
  // and make a userImportAlias for key methods in 'vue', like 'ref', 'reactive'
  // in order to create binding records
  analyzeFileImportStmts(analyzeCtx)

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
  // Analyze all Vine component function in this file
  vineCompFnDecls.forEach(
    (vineFnCompDecl) => {
      vineFileCtx.vineFnComps.push(
        buildVineCompFnCtx(
          vineCompilerHooks,
          vineFileCtx,
          vineFnCompDecl,
        ),
      )
    },
  )
}
