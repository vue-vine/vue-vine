import type { CallExpression, File, Identifier, ImportDeclaration, Node, TSPropertySignature, TaggedTemplateExpression, VariableDeclarator } from '@babel/types'
import {
  isArrowFunctionExpression,
  isCallExpression,
  isClassDeclaration,
  isExportNamedDeclaration,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isImportDeclaration,
  isMemberExpression,
  isNode,
  isReturnStatement,
  isStringLiteral,
  isTSEnumDeclaration,
  isTSInterfaceDeclaration,
  isTSTypeAliasDeclaration,
  isTaggedTemplateExpression,
  isVariableDeclaration,
  isVariableDeclarator,
  traverse,
} from '@babel/types'
import type { ParseResult } from '@babel/parser'
import type { BabelFunctionNodeTypes, BabelFunctionParams, Nil, VINE_MACRO_NAMES, VineBabelRoot } from './types'
import { VINE_MACROS, VUE_REACTIVITY_APIS } from './constants'

const vineRootScopeStatementTypeValidators = [
  isImportDeclaration,
  isExportNamedDeclaration,
  isFunctionDeclaration,
  isClassDeclaration,
  isTSEnumDeclaration,
  isVariableDeclaration,
  isTSTypeAliasDeclaration,
  isTSInterfaceDeclaration,
] as const

export function findVineCompFnDecls(root: VineBabelRoot) {
  const vineFnComps: Node[] = []
  for (const stmt of root.program.body) {
    // Since here we're just exploring root scope,
    // So we just need several required types
    traverse(stmt, (rootStmtNode) => {
      let target = rootStmtNode
      if (isExportNamedDeclaration(target) && target.declaration) {
        target = target.declaration
      }
      if (
        isFunctionDeclaration(target)
        || isVariableDeclaration(target)
      ) {
        traverse(target, (node) => {
          if (
            isReturnStatement(node)
            && isTaggedTemplateExpression(node.argument)
            && isIdentifier(node.argument.tag)
            && node.argument.tag.name === 'vine'
          ) {
            vineFnComps.push(rootStmtNode)
          }
        })
      }
    })
  }

  return vineFnComps
}

export function isDescendant(node: Node, potentialDescendant: Node): boolean {
  const stack: Node[] = [node]

  while (stack.length) {
    const currentNode = stack.pop() as Node

    if (currentNode === potentialDescendant) {
      return true
    }

    const children = Object.values(currentNode)
      .filter((child): child is Node | Node[] => Array.isArray(child) ? child.every(isNode) : isNode(child))

    for (const child of children) {
      if (Array.isArray(child)) {
        stack.push(...child)
      }
      else {
        stack.push(child)
      }
    }
  }

  return false
}

export function isVineTaggedTemplateString(node: Node): node is TaggedTemplateExpression {
  return (
    isTaggedTemplateExpression(node)
    && isIdentifier(node.tag)
    && node.tag.name === 'vine'
  )
}

export function isVineMacroCallExpression(node: Node): node is CallExpression {
  if (isCallExpression(node)) {
    const callee = node.callee
    if (isIdentifier(callee)) {
      return (VINE_MACROS as any as string[]).includes(callee.name)
    }
    if (isMemberExpression(callee)) {
      const obj = callee.object
      const prop = callee.property
      if (isIdentifier(obj) && isIdentifier(prop)) {
        return (VINE_MACROS as any as string[]).includes(
          `${obj.name}.${prop.name}`,
        )
      }
    }
  }
  return false
}

export function getVineMacroCalleeName(node: CallExpression) {
  const callee = node.callee
  if (isIdentifier(callee)) {
    return callee.name
  }
  if (isMemberExpression(callee)) {
    const obj = callee.object
    const prop = callee.property
    if (isIdentifier(obj) && isIdentifier(prop)) {
      return `${obj.name}.${prop.name}`
    }
  }
  return ''
}

export function isVineMacroOf(
  name: VINE_MACRO_NAMES | Array<VINE_MACRO_NAMES>,
) {
  return (node: Node | Nil): node is CallExpression => {
    if (isCallExpression(node)) {
      const callee = node.callee
      if (isIdentifier(callee)) {
        return Array.isArray(name)
          ? (name as any).includes(callee.name)
          : callee.name === name
      }
      if (isMemberExpression(callee)) {
        const obj = callee.object
        const prop = callee.property
        if (isIdentifier(obj) && isIdentifier(prop)) {
          return Array.isArray(name)
            ? name.some(n => `${obj.name}.${prop.name}`.includes(n))
            : `${obj.name}.${prop.name}`.includes(name)
        }
        return false
      }
    }
    return false
  }
}

export function isVueReactivityApiCallExpression(node: Node) {
  return (
    isCallExpression(node)
    && isIdentifier(node.callee)
    && (VUE_REACTIVITY_APIS as any).includes(node.callee.name)
  )
}

export function isValidVineRootScopeStatement(node: Node) {
  return vineRootScopeStatementTypeValidators.some(check => check(node))
}

export function isTagTemplateStringContainsInterpolation(tagTmplNode: TaggedTemplateExpression) {
  return tagTmplNode.quasi.expressions.length > 0
}

export function getFunctionParams(fnItselfNode: BabelFunctionNodeTypes) {
  const params: BabelFunctionParams = []
  if (isFunctionDeclaration(fnItselfNode)) {
    params.push(...fnItselfNode.params)
  }
  else if (
    isFunctionExpression(fnItselfNode)
    || isArrowFunctionExpression(fnItselfNode)
  ) {
    params.push(...fnItselfNode.params)
  }
  return params
}

export function getFunctionInfo(node: Node): {
  fnItselfNode: BabelFunctionNodeTypes | undefined
  fnName: string
} {
  let fnItselfNode: BabelFunctionNodeTypes | undefined = isFunctionDeclaration(node)
    ? node
    : undefined
  let fnName = isFunctionDeclaration(node)
    ? node.id?.name ?? ''
    : ''
  traverse(node, (descendant) => {
    let target = descendant
    if (isExportNamedDeclaration(descendant) && descendant.declaration) {
      target = descendant.declaration
    }
    if (isFunctionDeclaration(target)) {
      fnItselfNode = target
      fnName = target.id?.name ?? ''
    }
    else if (
      isVariableDeclaration(target)
      && (
        (
          isFunctionExpression(target.declarations[0].init)
          || isArrowFunctionExpression(target.declarations[0].init)
        )
        && isIdentifier(target.declarations[0].id)
      )
    ) {
      fnItselfNode = target.declarations[0].init
      fnName = target.declarations[0].id.name
    }
  })
  return {
    fnItselfNode,
    fnName,
  }
}

export function getVineTagTemplateStringNode(
  node: Node,
): TaggedTemplateExpression | undefined {
  let vineTagTmplNode: TaggedTemplateExpression | undefined
  traverse(node, (descendant) => {
    if (isVineTaggedTemplateString(descendant)) {
      vineTagTmplNode = descendant
    }
  })
  return vineTagTmplNode
}

export function getImportStatments(root: ParseResult<File>) {
  const importStmts: ImportDeclaration[] = []
  for (const stmt of root.program.body) {
    if (isImportDeclaration(stmt)) {
      importStmts.push(stmt)
    }
  }
  return importStmts
}

export function getTSTypeLiteralPropertySignatureName(tsTypeLit: TSPropertySignature) {
  return isIdentifier(tsTypeLit.key)
    ? tsTypeLit.key.name
    : isStringLiteral(tsTypeLit.key)
      ? tsTypeLit.key.value
      : ''
}

export function getAllVinePropMacroCall(fnItselfNode: BabelFunctionNodeTypes) {
  const allVinePropMacroCalls: [CallExpression, Identifier][] = [] // [macro Call, defined prop name]
  traverse(fnItselfNode.body, {
    enter(node, parent) {
      if (!isVineMacroOf('vineProp')(node)) {
        return
      }
      const propVarDeclarator = parent.find(ancestor => (
        isVariableDeclarator(ancestor.node)
        && isIdentifier(ancestor.node.id)
      ))
      if (!propVarDeclarator) {
        return
      }
      const propVarIdentifier = (propVarDeclarator.node as VariableDeclarator).id as Identifier
      allVinePropMacroCalls.push([node, propVarIdentifier])
    },
  })
  return allVinePropMacroCalls
}
