import type {
  CallExpression,
  File,
  Identifier,
  ImportDeclaration,
  Node,
  ReturnStatement,
  TSPropertySignature,
  TaggedTemplateExpression,
  VariableDeclarator,
} from '@babel/types'
import {
  isArrowFunctionExpression,
  isCallExpression,
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isImportDeclaration,
  isMemberExpression,
  isNode,
  isReturnStatement,
  isStringLiteral,
  isTaggedTemplateExpression,
  isVariableDeclaration,
  isVariableDeclarator,
  traverse,
} from '@babel/types'
import type { ParseResult } from '@babel/parser'
import type {
  BabelFunctionNodeTypes,
  BabelFunctionParams,
  Nil,
  VINE_MACRO_NAMES,
  VineBabelRoot,
  VineFnPickedInfo,
} from '../types'
import {
  EXPECTED_ERROR,
  TS_NODE_TYPES,
  VINE_MACROS,
  VUE_REACTIVITY_APIS,
} from '../constants'

export function isVineCompFnDecl(target: Node) {
  if (
    (
      isExportNamedDeclaration(target)
      || isExportDefaultDeclaration(target)
    ) && target.declaration) {
    target = target.declaration
  }
  if (
    isFunctionDeclaration(target)
    || isVariableDeclaration(target)
  ) {
    try {
      traverse(target, (node) => {
        if (
          isReturnStatement(node)
          && node.argument
          && isVineTaggedTemplateString(node.argument)
        ) {
          throw new Error(EXPECTED_ERROR)
        }

        // issue#100: simple function component like () => vine`...`
        if (
          isArrowFunctionExpression(node)
          && isVineTaggedTemplateString(node.body)
        ) {
          throw new Error(EXPECTED_ERROR)
        }
      })
    }
    catch (error: any) {
      if (error.message === EXPECTED_ERROR) {
        return true
      }
      throw error
    }
  }
  return false
}

export function findVineCompFnDecls(root: VineBabelRoot) {
  const vineFnComps: Node[] = []
  for (const stmt of root.program.body) {
    if (isVineCompFnDecl(stmt)) {
      vineFnComps.push(stmt)
    }
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

export function isVineTaggedTemplateString(node: Node | null | undefined): node is TaggedTemplateExpression {
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

export function getVinePropCallTypeParams(node: CallExpression) {
  // We restricted the `vineProp` can only have 1 type parameter
  return node.typeParameters?.params?.[0]
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

export const isVineProp = isVineMacroOf('vineProp')
export const isVineSlots = isVineMacroOf('vineSlots')
export const isVineEmits = isVineMacroOf('vineEmits')
export const isVineModel = isVineMacroOf('vineModel')
export const isVineStyle = isVineMacroOf('vineStyle')
export const isVineCustomElement = isVineMacroOf('vineCustomElement')

export function isStatementContainsVineMacroCall(node: Node) {
  let result = false
  traverse(node, (descendant) => {
    if (isVineMacroCallExpression(descendant)) {
      result = true
    }
  })
  return result
}

export function isVueReactivityApiCallExpression(node: Node) {
  return (
    isCallExpression(node)
    && isIdentifier(node.callee)
    && (VUE_REACTIVITY_APIS as any).includes(node.callee.name)
  )
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

export function getFunctionPickedInfos(fnDecl: Node): VineFnPickedInfo[] {
  const pickedInfo: Array<{
    fnDeclNode: Node
    fnItselfNode: BabelFunctionNodeTypes
    fnName: string
  }> = []

  let target = fnDecl
  if ((
    isExportNamedDeclaration(target)
    || isExportDefaultDeclaration(target)
  ) && target.declaration) {
    target = target.declaration
  }

  if (isVariableDeclaration(target)) {
    target.declarations.forEach(
      (decl) => {
        if (
          (
            isFunctionExpression(decl.init)
            || isArrowFunctionExpression(decl.init)
          )
          && isIdentifier(decl.id)
        ) {
          pickedInfo.push({
            fnDeclNode: fnDecl,
            fnItselfNode: decl.init,
            fnName: decl.id.name,
          })
        }
      },
    )

    return pickedInfo
  }

  if (isFunctionDeclaration(target)) {
    pickedInfo.push({
      fnDeclNode: fnDecl,
      fnItselfNode: target,
      fnName: target.id?.name ?? '',
    })
  }
  return pickedInfo
}

export function findVineTagTemplateStringReturn(node: Node) {
  let templateReturn: ReturnStatement | undefined
  let templateStringNode: TaggedTemplateExpression | undefined
  traverse(node, (descendant) => {
    if (isReturnStatement(descendant)) {
      templateReturn = descendant

      if (isVineTaggedTemplateString(descendant.argument)) {
        templateStringNode = descendant.argument
      }
    }
  })
  return {
    templateReturn,
    templateStringNode,
  }
}

export function getImportStatements(root: ParseResult<File>) {
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

export function unwrapTSNode(node: Node): Node {
  if (TS_NODE_TYPES.includes(node.type)) {
    return unwrapTSNode((node as any).expression)
  }
  else {
    return node
  }
}

export function isStaticNode(node: Node): boolean {
  node = unwrapTSNode(node)

  switch (node.type) {
    case 'UnaryExpression': // void 0, !true
      return isStaticNode(node.argument)

    case 'LogicalExpression': // 1 > 2
    case 'BinaryExpression': // 1 + 2
      return isStaticNode(node.left) && isStaticNode(node.right)

    case 'ConditionalExpression': {
      // 1 ? 2 : 3
      return (
        isStaticNode(node.test)
        && isStaticNode(node.consequent)
        && isStaticNode(node.alternate)
      )
    }

    case 'SequenceExpression': // (1, 2)
    case 'TemplateLiteral': // `foo${1}`
      return node.expressions.every(expr => isStaticNode(expr))

    case 'ParenthesizedExpression': // (1)
      return isStaticNode(node.expression)

    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'BigIntLiteral':
      return true
  }
  return false
}

export function isCallOf(
  node: Node | null | undefined,
  test: string | ((id: string) => boolean) | null | undefined,
): node is CallExpression {
  return !!(
    node
    && test
    && node.type === 'CallExpression'
    && node.callee.type === 'Identifier'
    && (typeof test === 'string'
      ? node.callee.name === test
      : test(node.callee.name))
  )
}

export function isLiteralNode(node: Node) {
  return node.type.endsWith('Literal')
}

export function canNeverBeRef(node: Node, userReactiveImport?: string): boolean {
  if (isCallOf(node, userReactiveImport)) {
    return true
  }
  switch (node.type) {
    case 'UnaryExpression':
    case 'BinaryExpression':
    case 'ArrayExpression':
    case 'ObjectExpression':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
    case 'UpdateExpression':
    case 'ClassExpression':
    case 'TaggedTemplateExpression':
      return true
    case 'SequenceExpression':
      return canNeverBeRef(
        node.expressions[node.expressions.length - 1],
        userReactiveImport,
      )
    default:
      if (isLiteralNode(node)) {
        return true
      }
      return false
  }
}

export function tryInferExpressionTSType(node: Node) {
  switch (node.type) {
    case 'BooleanLiteral':
      return 'boolean'
    case 'NumericLiteral':
      return 'number'
    case 'BigIntLiteral':
      return 'bigint'
    case 'StringLiteral':
      return 'string'
    case 'NullLiteral':
      return 'null'
    case 'Identifier':
      return (
        node.name === 'undefined'
          ? 'undefined'
          : `typeof ${node.name}`
      )

    default:
      return 'any' // Can't infer
  }
}
