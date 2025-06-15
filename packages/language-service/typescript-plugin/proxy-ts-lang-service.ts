import type { Language } from '@vue/language-core'
import type ts from 'typescript'
import { isVueVineVirtualCode } from '../src'

export function proxyLanguageServiceForVine(
  ts: typeof import('typescript'),
  language: Language<string>,
  languageService: ts.LanguageService,
): ts.LanguageService {
  const getProxyMethod = (
    target: ts.LanguageService,
    p: keyof ts.LanguageService,
  ) => {
    switch (p) {
      case 'getCompletionsAtPosition': return vineGetCompletionsAtPosition(target[p])
      case 'getDefinitionAndBoundSpan': return vineGetDefinitionAndBoundSpan(ts, language, languageService, target[p])
    }
  }

  return new Proxy(languageService, {
    get(target, p, receiver) {
      const overrideMethod = getProxyMethod(target, p as keyof ts.LanguageService)
      return (
        overrideMethod
        ?? Reflect.get(target, p, receiver)
      )
    },
    set(target, p, value, receiver) {
      return Reflect.set(target, p, value, receiver)
    },
  })
}

const hiddenCompletions = [
  'VUE_VINE_COMPONENT',
]
function vineGetCompletionsAtPosition(
  originalGetCompletionsAtPosition: ts.LanguageService['getCompletionsAtPosition'],
): ts.LanguageService['getCompletionsAtPosition'] {
  return (fileName, position, options, formattingSettings) => {
    const result = originalGetCompletionsAtPosition(fileName, position, options, formattingSettings)
    if (result) {
      // Filter all `__VINE_VLS_` items
      result.entries = result.entries.filter(
        entry => (
          !entry.name.includes('__VINE_VLS_')
          && !entry.labelDetails?.description?.includes('__VINE_VLS_')
          && !hiddenCompletions.includes(entry.name)
        ),
      )
    }

    return result
  }
}

function vineGetDefinitionAndBoundSpan(
  ts: typeof import('typescript'),
  language: Language<string>,
  languageService: ts.LanguageService,
  originalGetDefinitionAndBoundSpan: ts.LanguageService['getDefinitionAndBoundSpan'],
): ts.LanguageService['getDefinitionAndBoundSpan'] {
  return (fileName, position) => {
    const result = originalGetDefinitionAndBoundSpan(fileName, position)
    if (!result?.definitions?.length) {
      return result
    }

    const program = languageService.getProgram()!
    const sourceScript = language.scripts.get(fileName)
    if (!sourceScript?.generated) {
      return result
    }

    const root = sourceScript.generated.root
    if (!isVueVineVirtualCode(root)) {
      return result
    }

    // Check if position is inside Vine component's template string
    const allTemplateRanges = root.vineMetaCtx.vineFileCtx.vineCompFns
      .map((compFnCtx) => {
        const { templateStringNode } = compFnCtx
        const templateStart = templateStringNode?.start
        const templateEnd = templateStringNode?.end
        if (!templateStart || !templateEnd) {
          return null
        }

        return [templateStart, templateEnd]
      })
      .filter(Boolean) as [number, number][]

    const isInTemplate = allTemplateRanges.some(([start, end]) => {
      return position > start && position < end
    })

    if (!isInTemplate) {
      return result
    }

    const definitions = new Set<ts.DefinitionInfo>(result.definitions)
    const skippedDefinitions: ts.DefinitionInfo[] = []

    for (const definition of result.definitions) {
      if (
        definition.fileName.endsWith('.vue')
        || definition.fileName.endsWith('.vine.ts')
      ) {
        continue
      }

      const sourceFile = program.getSourceFile(definition.fileName)
      if (!sourceFile) {
        continue
      }

      visit(sourceFile, definition, sourceFile)
    }

    for (const skipped of skippedDefinitions) {
      definitions.delete(skipped)
    }

    return {
      definitions: [...definitions],
      textSpan: result.textSpan,
    }

    function visit(node: ts.Node, definition: ts.DefinitionInfo, sourceFile: ts.SourceFile) {
      if (ts.isPropertySignature(node) && node.type) {
        proxy(node.name, node.type, definition, sourceFile)
      }
      else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.type && !node.initializer) {
        proxy(node.name, node.type, definition, sourceFile)
      }
      else {
        ts.forEachChild(node, child => visit(child, definition, sourceFile))
      }
    }

    function proxy(
      name: ts.PropertyName,
      type: ts.TypeNode,
      definition: ts.DefinitionInfo,
      sourceFile: ts.SourceFile,
    ) {
      const { textSpan, fileName } = definition
      const start = name.getStart(sourceFile)
      const end = name.getEnd()

      if (start !== textSpan.start || end - start !== textSpan.length) {
        return
      }
      if (!ts.isIndexedAccessTypeNode(type)) {
        return
      }

      const pos = type.indexType.getStart(sourceFile)
      const res = originalGetDefinitionAndBoundSpan(fileName, pos)
      if (res?.definitions?.length) {
        for (const innerDefinition of res.definitions) {
          definitions.add(innerDefinition)
        }
        skippedDefinitions.push(definition)
      }
    }
  }
}
