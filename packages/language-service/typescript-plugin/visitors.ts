import type * as ts from 'typescript'
import type { VueVineVirtualCode } from '../src'
import type { PipelineServerContext } from './types'

export function searchFunctionDeclInRoot(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  name: string,
): ts.Node | undefined {
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
): ts.Node | undefined {
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
export function getComponentProps(
  context: PipelineServerContext,
  vineCode: VueVineVirtualCode,
  compName: string,
): string[] {
  const { ts, tsPluginInfo, tsPluginLogger } = context
  const program = tsPluginInfo.languageService.getProgram()
  if (!program) {
    return []
  }

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

export function getElementAttrs(
  context: PipelineServerContext,
  vineCode: VueVineVirtualCode,
  tagName: string,
): string[] {
  const { ts, tsPluginInfo, tsPluginLogger } = context
  const program = tsPluginInfo.languageService.getProgram()
  if (!program) {
    return []
  }

  const checker = program.getTypeChecker()
  const elements = getGlobalVariableType(ts, tsPluginInfo.languageService, vineCode, '__VINE_VLS_IntrinsicElements')
  if (!elements) {
    return []
  }
  const elementType = elements.type.getProperty(tagName)
  if (!elementType) {
    return []
  }

  const attrs = checker.getTypeOfSymbol(elementType).getProperties()
  const result = attrs.map(c => c.name)
  tsPluginLogger.info('Pipeline: Got element attrs', result)
  return result
}

export function getComponentDirectives(
  context: PipelineServerContext,
  vineCode: VueVineVirtualCode,
  triggerAtFnName: string,
): string[] {
  const { ts, tsPluginInfo, tsPluginLogger } = context
  const program = tsPluginInfo.languageService.getProgram()
  if (!program) {
    return []
  }

  // Find vine component function that is referenced by the triggerAtFnName
  const tsSourceFile = program.getSourceFile(vineCode.fileName)
  if (!tsSourceFile) {
    tsPluginLogger.info('No tsSourceFile found')
    return []
  }

  const triggerAtFnNode = searchFunctionDeclInRoot(ts, tsSourceFile, triggerAtFnName)
  if (!triggerAtFnNode) {
    tsPluginLogger.info('No triggerAtFnNode found')
    return []
  }

  // Search `__VINE_VLS_directives` in the triggerAtFnNode,
  // this variable is generated for every vine component function
  const vlsDirectivesNode = searchVarDeclInCompFn(ts, triggerAtFnNode, '__VINE_VLS_directives')
  if (!vlsDirectivesNode) {
    tsPluginLogger.info('No vlsDirectivesNode found')
    return []
  }

  const checker = program.getTypeChecker()
  const directivesType = checker.getTypeAtLocation(vlsDirectivesNode)
  tsPluginLogger.info('directivesType', checker.typeToString(directivesType))

  const directivesNames = directivesType?.getProperties()
    .map(({ name }) => name)
    .filter(name => name.startsWith('v') && name.length >= 2 && name[1] === name[1].toUpperCase())
    .filter(name => !['vBind', 'vIf', 'vOn', 'VOnce', 'vShow', 'VSlot'].includes(name)) ?? []

  tsPluginLogger.info('Pipeline: Got component directives', `[ ${directivesNames.join(', ')} ]`)
  return directivesNames
}

function searchVariableDeclarationNode(
  ts: typeof import('typescript'),
  sourceFile: ts.Node,
  name: string,
): ts.Node | undefined {
  let result: ts.Node | undefined
  walk(sourceFile)
  return result

  function walk(node: ts.Node) {
    if (result) {
      return
    }

    if (ts.isVariableDeclaration(node) && node.name.getText() === name) {
      result = node
    }
    else {
      node.forEachChild(walk)
    }
  }
}

export function getGlobalVariableType(
  ts: typeof import('typescript'),
  languageService: ts.LanguageService,
  vueCode: VueVineVirtualCode,
  name: string,
): {
  node: ts.Node
  type: ts.Type
} | undefined {
  const program = languageService.getProgram()
  if (!program) {
    return
  }

  const tsSourceFile = program.getSourceFile(vueCode.fileName)
  if (tsSourceFile) {
    const checker = program.getTypeChecker()
    const node = searchVariableDeclarationNode(ts, tsSourceFile, name)
    if (node) {
      return {
        node,
        type: checker.getTypeAtLocation(node),
      }
    }
  }
}
