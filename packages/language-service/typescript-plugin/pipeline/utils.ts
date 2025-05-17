import type ts from 'typescript'
import type { VueVineVirtualCode } from '../../src/shared'

function searchVariableDeclarationNode(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  name: string,
) {
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

export function getVariableType(
  ts: typeof import('typescript'),
  languageService: ts.LanguageService,
  vueCode: VueVineVirtualCode,
  name: string,
) {
  const program = languageService.getProgram()!

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
