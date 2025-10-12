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
  const { ts, tsPluginInfo } = context
  const program = tsPluginInfo.languageService.getProgram()
  if (!program) {
    return []
  }

  const tsSourceFile = program.getSourceFile(vineCode.fileName)
  if (!tsSourceFile) {
    return []
  }

  const vlsCompsMapNode = searchVarDeclInCompFn(ts, tsSourceFile, '__VLS_VINE_ComponentsReferenceMap')
  const checker = program.getTypeChecker()
  if (!vlsCompsMapNode) {
    return []
  }

  const vlsCompsMapType = checker.getTypeAtLocation(vlsCompsMapNode)
  const compSymbol = vlsCompsMapType.getProperty(compName)
  if (!compSymbol) {
    return []
  }

  const compFnType = checker.getTypeOfSymbolAtLocation(compSymbol, vlsCompsMapNode)
  if (!compFnType) {
    return []
  }

  const propsNames = new Set<string>()

  // Helper function to handle each prop symbol
  function handlePropSymbol(prop: ts.Symbol) {
    propsNames.add(prop.getName())
  }

  // Handle call signatures: (props: ...) => { ... }
  for (const sig of compFnType.getCallSignatures()) {
    if (sig.parameters.length) {
      const propParam = sig.parameters[0]!
      const propsType = checker.getTypeOfSymbol(propParam)
      const props = propsType.getProperties()
      for (const prop of props) {
        handlePropSymbol(prop)
      }
    }
  }

  // Handle construct signatures: new (props: ...) => Component
  for (const sig of compFnType.getConstructSignatures()) {
    const instanceType = sig.getReturnType()
    const propsSymbol = instanceType.getProperty('$props')
    if (propsSymbol) {
      const propsType = checker.getTypeOfSymbol(propsSymbol)
      const props = propsType.getProperties()
      for (const prop of props) {
        handlePropSymbol(prop)
      }
    }
  }

  return Array.from(propsNames)
}

export function getElementAttrs(
  context: PipelineServerContext,
  vineCode: VueVineVirtualCode,
  tagName: string,
): string[] {
  const { ts, tsPluginInfo } = context
  const program = tsPluginInfo.languageService.getProgram()
  if (!program) {
    return []
  }

  const checker = program.getTypeChecker()
  const elements = getGlobalVariableType(ts, tsPluginInfo.languageService, vineCode, '__VLS_IntrinsicElements')
  if (!elements) {
    return []
  }
  const elementType = elements.type.getProperty(tagName)
  if (!elementType) {
    return []
  }

  const attrs = checker.getTypeOfSymbol(elementType).getProperties()
  const result = attrs.map(c => c.name)
  return result
}

export function getComponentDirectives(
  context: PipelineServerContext,
  vineCode: VueVineVirtualCode,
  triggerAtFnName: string,
): string[] {
  const { ts, tsPluginInfo } = context
  const program = tsPluginInfo.languageService.getProgram()
  if (!program) {
    return []
  }

  // Find vine component function that is referenced by the triggerAtFnName
  const tsSourceFile = program.getSourceFile(vineCode.fileName)
  if (!tsSourceFile) {
    return []
  }

  const triggerAtFnNode = searchFunctionDeclInRoot(ts, tsSourceFile, triggerAtFnName)
  if (!triggerAtFnNode) {
    return []
  }

  // Search `__VLS_directives` in the triggerAtFnNode,
  // this variable is generated for every vine component function
  const vlsDirectivesNode = searchVarDeclInCompFn(ts, triggerAtFnNode, '__VLS_directives')
  if (!vlsDirectivesNode) {
    return []
  }

  const checker = program.getTypeChecker()
  const directivesType = checker.getTypeAtLocation(vlsDirectivesNode)

  const directivesNames = directivesType?.getProperties()
    .map(({ name }) => name)
    .filter(name => name.startsWith('v') && name.length >= 2 && name[1] === name[1].toUpperCase())
    .filter(name => !['vBind', 'vIf', 'vOn', 'VOnce', 'vShow', 'VSlot'].includes(name)) ?? []

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
