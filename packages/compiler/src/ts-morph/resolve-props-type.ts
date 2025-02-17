import type { Node as BabelNode } from '@babel/types'
import type { ArrowFunction, FunctionDeclaration, FunctionExpression, SourceFile, TaggedTemplateExpression, Type, TypeChecker, VariableDeclaration } from 'ts-morph'
import type { VineCompFnCtx, VinePropMeta } from '../types'
import { Node } from 'ts-morph'

function isBooleanType(
  typeChecker: TypeChecker,
  type: Type,
) {
  // Boolean cast
  if (type.isBoolean())
    return true

  // Union types like: (true | false or boolean | undefined ...)
  if (type.isUnion()) {
    return type.getUnionTypes().every(t =>
      t.isBoolean()
      || (t.isLiteral() && (t.getLiteralValue() === 'true' || t.getLiteralValue() === 'false')),
    )
  }

  // Intersection types like: (boolean & T1 & T2)
  if (type.isIntersection()) {
    return type.getIntersectionTypes().some(t => t.isBoolean())
  }

  // Alias types, need to get the actual type
  const aliasSymbol = type.getAliasSymbol()
  if (aliasSymbol) {
    const aliasType = typeChecker.getDeclaredTypeOfSymbol(aliasSymbol)
    return isBooleanType(typeChecker, aliasType)
  }

  return false
};

export function resolveVineCompFnProps(params: {
  typeChecker: TypeChecker
  sourceFile: SourceFile
  vineCompFnCtx: VineCompFnCtx
  defaultsFromDestructuredProps: Record<string, BabelNode>
}) {
  const { typeChecker, sourceFile, vineCompFnCtx, defaultsFromDestructuredProps } = params
  const propsInfo: Record<string, VinePropMeta> = {}

  const targetFn = sourceFile.getFirstDescendant(
    (node) => {
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

      return !!returnStatement && fnName === vineCompFnCtx.fnName
    },
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
    propsInfo[propName] = {
      isFromMacroDefine: false,
      isRequired: !prop.isOptional(),
      isBool: isBooleanType(typeChecker, propType),
    }
    if (defaultsFromDestructuredProps[propName]) {
      propsInfo[propName].default = defaultsFromDestructuredProps[propName]
    }
  }

  return propsInfo
}
