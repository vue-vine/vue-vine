import type { ArrowFunction, FunctionDeclaration, FunctionExpression, SourceFile, TaggedTemplateExpression, Type, TypeChecker, VariableDeclaration } from 'ts-morph'
import type { VineCompFnCtx, VinePropMeta } from '../types'
import { Node } from 'ts-morph'

function isBooleanType(
  typeChecker: TypeChecker,
  type: Type,
) {
  // 直接 boolean
  if (type.isBoolean())
    return true

  // 联合类型 (true | false 或 boolean | undefined 等)
  if (type.isUnion()) {
    return type.getUnionTypes().every(t =>
      t.isBoolean()
      || (t.isLiteral() && (t.getLiteralValue() === 'true' || t.getLiteralValue() === 'false')),
    )
  }

  // 交叉类型
  if (type.isIntersection()) {
    return type.getIntersectionTypes().some(t => t.isBoolean())
  }

  // 别名类型，需要获取其实际类型
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
}) {
  const { typeChecker, sourceFile, vineCompFnCtx } = params
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
        node => (
          Node.isReturnStatement(node)
          && Node.isTaggedTemplateExpression(node.getExpression())
          && (node.getExpression() as TaggedTemplateExpression | undefined)?.getTag().getText() === 'vine'
        ),
      )

      const fnName = (
        Node.isFunctionDeclaration(node)
          ? node.getName()
          : node.getNameNode()?.getText()
      )

      return !!returnStatement && fnName === vineCompFnCtx.fnName
    },
  ) as (FunctionDeclaration | VariableDeclaration)

  const propsParams = (
    Node.isFunctionDeclaration(targetFn)
      ? targetFn.getParameters()
      : (targetFn.getInitializer() as FunctionExpression | ArrowFunction).getParameters()
  )[0]
  const propsTypeAnnotation = propsParams.getTypeNode()!
  const propsType = typeChecker.getTypeAtLocation(propsTypeAnnotation)

  for (const prop of propsType.getProperties()) {
    propsInfo[prop.getName()] = {
      isFromMacroDefine: false,
      isBool: isBooleanType(typeChecker, propsType),
      isRequired: !prop.isOptional(),
    }
  }

  return propsInfo
}
