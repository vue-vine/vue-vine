import type * as ts from 'typescript'
import type { VueVineCode } from '../src'
import type { PipelineContext } from './types'

export function searchFunctionDeclInRoot(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  name: string,
) {
  let functionNode: ts.Node | undefined
  walk(sourceFile)
  return functionNode

  function walk(node: ts.Node) {
    if (functionNode) {
      return
    }

    if (ts.isFunctionDeclaration(node) && node.name?.getText() === name) {
      functionNode = node
    }
    else if (
      ts.isVariableDeclaration(node)
      && node.name.getText() === name
      && node.initializer
      && (
        ts.isArrowFunction(node.initializer)
        || ts.isFunctionExpression(node.initializer)
      )
    ) {
      functionNode = node.initializer
    }
    else {
      node.forEachChild(walk)
    }
  }
}

export function searchVarDeclInCompFn(
  ts: typeof import('typescript'),
  compFnNode: ts.Node,
  name: string,
) {
  let componentsNode: ts.Node | undefined
  walk(compFnNode)
  return componentsNode

  function walk(node: ts.Node) {
    if (componentsNode) {
      return
    }

    if (ts.isVariableDeclaration(node) && node.name.getText() === name) {
      componentsNode = node
    }
    else {
      node.forEachChild(walk)
    }
  }
}

/**
 * Get component props and emits from TypeScript context.
 *
 * Since we've already merged props and emits in virtual code,
 * we only need to return all props names here.
 */
export function getComponentPropsAndEmits(
  context: PipelineContext,
  vineCode: VueVineCode,
  compName: string,
): string[] {
  const { ts, tsPluginInfo, tsPluginLogger } = context
  const program = tsPluginInfo.languageService.getProgram()!
  const tsSourceFile = program.getSourceFile(vineCode.fileName)
  if (!tsSourceFile) {
    return []
  }

  const vlsCompsMapNode = searchVarDeclInCompFn(ts, tsSourceFile, '__VINE_VLS_ComponentsReferenceMap')
  const checker = program.getTypeChecker()
  if (!vlsCompsMapNode) {
    return []
  }

  const vlsCompsMapType = checker.getTypeAtLocation(vlsCompsMapNode)
  tsPluginLogger.info('vlsCompsMapType', checker.typeToString(vlsCompsMapType))
  const compSymbol = vlsCompsMapType.getProperty(compName)
  if (!compSymbol) {
    return []
  }

  const compFnType = checker.getTypeOfSymbolAtLocation(compSymbol, tsSourceFile)
  if (!compFnType) {
    return []
  }
  tsPluginLogger.info('compFnType', checker.typeToString(compFnType))

  // `compFnType` is (props: ...) => { ... }
  // we need to extract `props` type from it
  const propsNode = compFnType.getCallSignatures()[0].getParameters()[0]!
  const propsType = checker.getTypeOfSymbol(propsNode)

  // Extract all properties
  const propsNames = propsType
    .getProperties()
    .map(p => p.getName())

  return propsNames
}
