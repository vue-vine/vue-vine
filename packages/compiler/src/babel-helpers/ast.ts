import type { ParseResult } from '@babel/parser'
import type {
  CallExpression,
  ExportNamedDeclaration,
  File,
  Identifier,
  ImportDeclaration,
  Node,
  ReturnStatement,
  TaggedTemplateExpression,
  TSPropertySignature,
  TSType,
  VariableDeclarator,
} from '@babel/types'
import type {
  BabelFunctionNodeTypes,
  BabelFunctionParams,
  Nil,
  VINE_MACRO_NAMES,
  VineBabelRoot,
  VineFnPickedInfo,
  VinePropMacroInfo,
} from '../types'
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
import { TS_NODE_TYPES } from '@vue/compiler-dom'
import {
  EXPECTED_ERROR,
  VINE_MACROS,
  VUE_REACTIVITY_APIS,
} from '../constants'
import { _breakableTraverse, exitTraverse } from '../utils'

export function isVineCompFnDecl(target: Node): boolean {
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

export function findVineCompFnDecls(root: VineBabelRoot): Node[] {
  const vineFnComps: Node[] = []
  for (const stmt of root.program.body) {
    if (isVineCompFnDecl(stmt)) {
      vineFnComps.push(stmt)
    }
  }
  return vineFnComps
}

export function isBabelFunctionTypes(node: Node): node is BabelFunctionNodeTypes {
  return (
    isFunctionDeclaration(node)
    || isFunctionExpression(node)
    || isArrowFunctionExpression(node)
  )
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

export function isVineVaporTaggedTemplateString(node: Node | null | undefined): node is TaggedTemplateExpression {
  if (!isTaggedTemplateExpression(node)) {
    return false
  }

  return (
    isMemberExpression(node.tag)
    && isIdentifier(node.tag.object)
    && node.tag.object.name === 'vine'
    && isIdentifier(node.tag.property)
    && node.tag.property.name === 'vapor'
  )
}

export function isVineTaggedTemplateString(node: Node | null | undefined): node is TaggedTemplateExpression {
  if (!isTaggedTemplateExpression(node)) {
    return false
  }

  // vine`...` or vine.vapor`...`
  if (isIdentifier(node.tag) && node.tag.name === 'vine') {
    return true
  }
  if (isVineVaporTaggedTemplateString(node)) {
    return true
  }

  return false
}

export function isVineMacroCallExpression(node: Node): node is CallExpression {
  if (isCallExpression(node)) {
    const calleeName = getVineMacroCalleeName(node)
    return (VINE_MACROS as any as string[]).includes(calleeName)
  }
  return false
}

export function getVineMacroCalleeName(node: CallExpression): string {
  const callee = node.callee
  if (isIdentifier(callee)) {
    return callee.name
  }
  if (isMemberExpression(callee)) {
    // Recursively build the member expression chain
    const buildMemberPath = (node: Node): string => {
      if (isIdentifier(node)) {
        return node.name
      }
      if (isMemberExpression(node)) {
        const objPath = buildMemberPath(node.object)
        if (isIdentifier(node.property)) {
          return `${objPath}.${node.property.name}`
        }
      }
      return ''
    }

    return buildMemberPath(callee)
  }
  return ''
}

export function getVinePropCallTypeParams(node: CallExpression): TSType | undefined {
  // We restricted the `vineProp` can only have 1 type parameter
  return node.typeParameters?.params?.[0]
}

/**
 * Check if it belongs to a certain category of macro instead of directly checking callee name
 * @param name - The name of the macro or an array of macro names
 */
export function isVineMacroOf(
  name: VINE_MACRO_NAMES | Array<VINE_MACRO_NAMES>,
) {
  return (node: Node | Nil): node is CallExpression => {
    if (!isCallExpression(node)) {
      return false
    }

    const macroCalleeName = getVineMacroCalleeName(node) as VINE_MACRO_NAMES
    return (
      Array.isArray(name)
        ? name.includes(macroCalleeName)
        : macroCalleeName.includes(name)
    )
  }
}

type IsVineMacroOf = (node: Node | Nil) => node is CallExpression
export const isVineProp: IsVineMacroOf = isVineMacroOf('vineProp')
export const isVineSlots: IsVineMacroOf = isVineMacroOf('vineSlots')
export const isVineEmits: IsVineMacroOf = isVineMacroOf('vineEmits')
export const isVineModel: IsVineMacroOf = isVineMacroOf('vineModel')
export const isVineStyle: IsVineMacroOf = isVineMacroOf([
  'vineStyle',
  'vineStyle.scoped',
  'vineStyle.import',
  'vineStyle.import.scoped',
])
export const isVineCustomElement: IsVineMacroOf = isVineMacroOf('vineCustomElement')
export const isVineValidators: IsVineMacroOf = isVineMacroOf('vineValidators')
export function isUseTemplateRefCall(node: Node): node is CallExpression {
  return isCallOf(node, 'useTemplateRef')
}

export function isStatementContainsVineMacroCall(node: Node): boolean {
  let result = false
  _breakableTraverse(node, (descendant) => {
    if (isVineMacroCallExpression(descendant)) {
      result = true
      throw exitTraverse
    }
  })
  return result
}

export function isVueReactivityApiCallExpression(node: Node): boolean {
  return (
    isCallExpression(node)
    && isIdentifier(node.callee)
    && (VUE_REACTIVITY_APIS as any).includes(node.callee.name)
  )
}

export function isTagTemplateStringContainsInterpolation(tagTmplNode: TaggedTemplateExpression): boolean {
  return tagTmplNode.quasi.expressions.length > 0
}

export function getFunctionParams(fnItselfNode: BabelFunctionNodeTypes): BabelFunctionParams {
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
            fnDeclNode: fnDecl, // VariableDeclarator
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
      fnDeclNode: fnDecl, // FunctionDeclaration
      fnItselfNode: target,
      fnName: target.id?.name ?? '',
    })
  }
  return pickedInfo
}

export function findVineTagTemplateStringReturn(node: Node): {
  templateReturn: ReturnStatement | undefined
  templateStringNode: TaggedTemplateExpression | undefined
} {
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

export function getImportStatements(root: ParseResult<File>): ImportDeclaration[] {
  const importStmts: ImportDeclaration[] = []
  for (const stmt of root.program.body) {
    if (isImportDeclaration(stmt)) {
      importStmts.push(stmt)
    }
  }
  return importStmts
}

export function getTSTypeLiteralPropertySignatureName(tsTypeLit: TSPropertySignature): string {
  return isIdentifier(tsTypeLit.key)
    ? tsTypeLit.key.name
    : isStringLiteral(tsTypeLit.key)
      ? tsTypeLit.key.value
      : ''
}

export function getAllVinePropMacroCall(fnItselfNode: BabelFunctionNodeTypes): VinePropMacroInfo[] {
  const allVinePropMacroCalls: VinePropMacroInfo[] = [] // [macro Call, defined prop name]
  traverse(fnItselfNode.body, {
    enter(node, parent) {
      if (!isVineMacroOf('vineProp')(node)) {
        return
      }

      const statement = parent.find(ancestor => isVariableDeclaration(ancestor.node))
      const propVarDeclarator = parent.find(ancestor => (
        isVariableDeclarator(ancestor.node)
        && isIdentifier(ancestor.node.id)
      ))
      if (!propVarDeclarator) {
        return
      }
      const propVarIdentifier = (propVarDeclarator.node as VariableDeclarator).id as Identifier
      allVinePropMacroCalls.push({
        macroCall: node,
        identifier: propVarIdentifier,
        jsDocComments: statement
          ?.node
          .leadingComments
          ?.filter(comment => comment.type === 'CommentBlock')
          ?? [],
      })
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

export function isLiteralNode(node: Node): boolean {
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

export function tryInferExpressionTSType(node: Node): string {
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

export function findAllExportNamedDeclarations(root: ParseResult<File>): ExportNamedDeclaration[] {
  const exportNamedDeclarations: ExportNamedDeclaration[] = []
  for (const stmt of root.program.body) {
    if (isExportNamedDeclaration(stmt)) {
      exportNamedDeclarations.push(stmt)
    }
  }

  return exportNamedDeclarations
}

export function fineAllExplicitExports(exportNamedDeclarations: ExportNamedDeclaration[]): string[] {
  const explicitExports: string[] = []
  for (const exportDecl of exportNamedDeclarations) {
    for (const specifier of exportDecl.specifiers) {
      if (isIdentifier(specifier.exported)) {
        explicitExports.push(specifier.exported.name)
      }
    }
  }
  return explicitExports
}
