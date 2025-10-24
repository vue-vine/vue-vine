import type { Node as BabelNode } from '@babel/types'
import type { ArrowFunction, FunctionDeclaration, FunctionExpression, TaggedTemplateExpression, Node as TsMorphNode, Type, TypeChecker, VariableDeclaration } from 'ts-morph'
import type { TsMorphCache, VineCompFnCtx, VineCompilerHooks, VinePropMeta } from '../types'
import { Node } from 'ts-morph'
import { vineErr } from '../diagnostics'

// Regular expression to test if a string is a valid JavaScript identifier
const identRE = /^[_$a-z\xA0-\uFFFF][\w$\xA0-\uFFFF]*$/i

function isBooleanType(
  typeChecker: TypeChecker,
  type: Type,
): boolean {
  if (
    type.isBoolean()
    || type.isBooleanLiteral()
    || (
      type.isLiteral()
      && (
        type.getLiteralValue() === 'true'
        || type.getLiteralValue() === 'false'
      )
    )
  ) {
    return true
  }

  // Union types like: (true | false or boolean | undefined ...)
  if (type.isUnion()) {
    return type.getUnionTypes().some(t =>
      isBooleanType(typeChecker, t),
    )
  }

  // Intersection types like: (boolean & T1 & T2)
  if (type.isIntersection()) {
    return type.getIntersectionTypes().some(t => isBooleanType(typeChecker, t))
  }

  // Generic types, need to get the actual type
  if (type.isTypeParameter()) {
    const actualType = type.getConstraint()
    if (actualType) {
      return isBooleanType(typeChecker, actualType)
    }
  }

  // Alias types, need to get the actual type
  const aliasSymbol = type.getAliasSymbol()
  if (aliasSymbol) {
    const aliasType = typeChecker.getDeclaredTypeOfSymbol(aliasSymbol)
    return isBooleanType(typeChecker, aliasType)
  }

  return false
};

export function tsAstFindVineCompFn(vineCompFnName: string): Parameters<TsMorphNode['getFirstDescendant']>[0] {
  return (node) => {
  // Function declaration: function ...() {}
    if (!Node.isFunctionDeclaration(node)) {
    // Variable declaration: const ... = () => {} / const ... = function() {}
      if (
        !Node.isVariableDeclaration(node)
        || !node.getInitializer()
        || (
          !Node.isFunctionExpression(node.getInitializer())
          && !Node.isArrowFunction(node.getInitializer())
        )
      ) {
        return false
      }
    }

    const body = (
      Node.isFunctionDeclaration(node)
        ? node.getBody()
        : (node.getInitializer() as FunctionExpression | ArrowFunction).getBody()
    )
    if (!body) {
      return false
    }

    // Look for return statement with tagged template literal tagged with `vine`
    const returnStatement = body.getFirstDescendant(
      nodeInReturnStmt => (
        Node.isReturnStatement(nodeInReturnStmt)
        && Node.isTaggedTemplateExpression(nodeInReturnStmt.getExpression())
        && (nodeInReturnStmt.getExpression() as TaggedTemplateExpression | undefined)?.getTag().getText() === 'vine'
      ),
    )

    const fnName = (
      Node.isFunctionDeclaration(node)
        ? node.getName()
        : node.getNameNode()?.getText()
    )

    return !!returnStatement && fnName === vineCompFnName
  }
}

export function resolveVineCompFnProps(params: {
  tsMorphCache: TsMorphCache
  vineCompFnCtx: VineCompFnCtx
  defaultsFromDestructuredProps: Record<string, BabelNode>
}): Record<string, VinePropMeta> {
  const {
    tsMorphCache,
    vineCompFnCtx,
    defaultsFromDestructuredProps,
  } = params
  const { typeChecker, project } = tsMorphCache
  const sourceFile = project.getSourceFile(vineCompFnCtx.fileCtx.fileId)
  if (!sourceFile) {
    return {}
  }

  const propsInfo: Record<string, VinePropMeta> = {}
  const targetFn = sourceFile.getFirstDescendant(
    tsAstFindVineCompFn(vineCompFnCtx.fnName),
  ) as (FunctionDeclaration | VariableDeclaration | undefined)

  if (!targetFn) {
    return propsInfo
  }
  const propsParams = (
    Node.isFunctionDeclaration(targetFn)
      ? targetFn.getParameters()
      : (targetFn.getInitializer() as FunctionExpression | ArrowFunction)?.getParameters()
  )?.[0]
  if (!propsParams) {
    return propsInfo
  }
  const propsIdentifier = propsParams.getNameNode()
  const propsType = propsIdentifier.getType()

  for (const prop of propsType.getProperties()) {
    const propType = typeChecker.getTypeOfSymbolAtLocation(prop, propsIdentifier)

    const propName = prop.getName()
    // Check if prop name is not a valid identifier (e.g., kebab-case like 'aria-atomic')
    const nameNeedQuoted = !identRE.test(propName)

    propsInfo[propName] = {
      isFromMacroDefine: false,
      isRequired: !prop.isOptional(),
      isMaybeBool: isBooleanType(typeChecker, propType),
      nameNeedQuoted,
    }
    if (defaultsFromDestructuredProps[propName]) {
      propsInfo[propName].default = defaultsFromDestructuredProps[propName]
    }
  }

  return propsInfo
}

export function checkForBoolean(param: {
  propName: string
  tsMorphCache: TsMorphCache
  vineCompilerHooks: VineCompilerHooks
  vineCompFnCtx: VineCompFnCtx
  babelNode: BabelNode
}): boolean {
  // We should check whether the given babel node is a boolean type
  // - Maybe it's a `vineProp.withDefault`'s default value expression
  // - Maybe it's a type parameter of macro call
  const { propName, tsMorphCache, vineCompilerHooks, vineCompFnCtx, babelNode } = param
  const { typeChecker, project } = tsMorphCache
  const sourceFile = project.getSourceFileOrThrow(vineCompFnCtx.fileCtx.fileId)

  const tsAstNode = sourceFile.getDescendantAtStartWithWidth(
    babelNode.start!,
    (babelNode.end! - babelNode.start!),
  )
  if (!tsAstNode) {
    return false
  }

  try {
    const tsAstNodeType = typeChecker.getTypeAtLocation(tsAstNode)
    return isBooleanType(typeChecker, tsAstNodeType)
  }
  catch (err) {
    vineCompilerHooks.onError(
      vineErr(
        { vineFileCtx: vineCompFnCtx.fileCtx, vineCompFnCtx },
        {
          msg: `Failed to check boolean type of prop "${propName}". ${err}`,
          location: babelNode.loc,
        },
      ),
    )
    return false
  }
}
