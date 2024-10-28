import type { CompilerDOM, Language, VueCompilerOptions } from '@vue/language-core'
import type { VueVineCode } from '@vue-vine/language-service'
import type * as ts from 'typescript'
import type { RequestContext } from './requests/types'
import { forEachElementNode, hyphenateTag } from '@vue/language-core'
import { isVueVineVirtualCode } from '@vue-vine/language-service'
import { _getComponentNames } from './requests/component-infos'

const windowsPathReg = /\\/g

export function proxyLanguageServiceForVueVine<T>(
  ts: typeof import('typescript'),
  language: Language<T>,
  languageService: ts.LanguageService,
  vueOptions: VueCompilerOptions,
  asScriptId: (fileName: string) => T,
) {
  const proxyCache = new Map<string | symbol, ((...args: any[]) => void) | undefined>()
  const getProxyMethod = (target: ts.LanguageService, p: string | symbol): ((...args: any[]) => void) | undefined => {
    switch (p) {
      case 'getCompletionsAtPosition': return getCompletionsAtPosition(vueOptions, target[p])
      case 'getCompletionEntryDetails': return getCompletionEntryDetails(language, asScriptId, target[p])
      case 'getCodeFixesAtPosition': return getCodeFixesAtPosition(target[p])
      case 'getQuickInfoAtPosition': return getQuickInfoAtPosition(ts, target, target[p])
        // TS plugin only
      case 'getEncodedSemanticClassifications': return getEncodedSemanticClassifications(ts, language, target, asScriptId, target[p])
    }
  }

  return new Proxy(languageService, {
    get(target, p, receiver) {
      if (getProxyMethod) {
        if (!proxyCache.has(p)) {
          proxyCache.set(p, getProxyMethod(target, p))
        }
        const proxyMethod = proxyCache.get(p)
        if (proxyMethod) {
          return proxyMethod
        }
      }
      return Reflect.get(target, p, receiver)
    },
    set(target, p, value, receiver) {
      return Reflect.set(target, p, value, receiver)
    },
  })
}

function getCompletionsAtPosition(
  vueOptions: VueCompilerOptions,
  getCompletionsAtPosition: ts.LanguageService['getCompletionsAtPosition'],
): ts.LanguageService['getCompletionsAtPosition'] {
  return (filePath, position, options, formattingSettings) => {
    const fileName = filePath.replace(windowsPathReg, '/')
    const result = getCompletionsAtPosition(fileName, position, options, formattingSettings)
    if (result) {
      // filter __VINE_VLS_
      result.entries = result.entries.filter(
        entry => !entry.name.includes('__VINE_VLS_')
          && (!entry.labelDetails?.description || !entry.labelDetails.description.includes('__VLS_')),
      )
    }
    return result
  }
}

function getCompletionEntryDetails<T>(
  language: Language<T>,
  asScriptId: (fileName: string) => T,
  getCompletionEntryDetails: ts.LanguageService['getCompletionEntryDetails'],
): ts.LanguageService['getCompletionEntryDetails'] {
  return (...args) => {
    const details = getCompletionEntryDetails(...args)
    return details
  }
}

function getCodeFixesAtPosition(getCodeFixesAtPosition: ts.LanguageService['getCodeFixesAtPosition']): ts.LanguageService['getCodeFixesAtPosition'] {
  return (...args) => {
    let result = getCodeFixesAtPosition(...args)
    // filter __VINE_VLS_
    result = result.filter(entry => !entry.description.includes('__VINE_VLS_'))
    return result
  }
}

function getQuickInfoAtPosition(ts: typeof import('typescript'), languageService: ts.LanguageService, getQuickInfoAtPosition: ts.LanguageService['getQuickInfoAtPosition']): ts.LanguageService['getQuickInfoAtPosition'] {
  return (...args) => {
    const result = getQuickInfoAtPosition(...args)
    return result
  }
}

function getEncodedSemanticClassifications<T>(
  ts: typeof import('typescript'),
  language: Language<T>,
  languageService: ts.LanguageService,
  asScriptId: (fileName: string) => T,
  getEncodedSemanticClassifications: ts.LanguageService['getEncodedSemanticClassifications'],
): ts.LanguageService['getEncodedSemanticClassifications'] {
  return (filePath, span, format) => {
    const fileName = filePath.replace(windowsPathReg, '/')
    const result = getEncodedSemanticClassifications(fileName, span, format)
    const file = language.scripts.get(asScriptId(fileName))
    if (isVueVineVirtualCode(file?.generated?.root)) {
      const { vineCompFns } = file.generated.root.vineMetaCtx.vineFileCtx
      for (const vineFn of vineCompFns) {
        const { templateAst } = vineFn
        if (!templateAst)
          continue

        for (const componentSpan of getComponentSpans.call(
          { typescript: ts, languageService },
          file.generated.root,
          templateAst as CompilerDOM.RootNode,
          span,
        )) {
          result.spans.push(
            componentSpan.start,
            componentSpan.length,
            256, // class
          )
        }
      }
    }
    return result
  }
}

export function getComponentSpans(
  this: Pick<RequestContext, 'typescript' | 'languageService'>,
  vueVineCode: VueVineCode,
  templateAst: CompilerDOM.RootNode,
  spanTemplateRange: ts.TextSpan,
) {
  const { typescript: ts, languageService } = this
  const result: ts.TextSpan[] = []
  const validComponentNames = _getComponentNames(ts, languageService, vueVineCode)
  const components = new Set([
    ...validComponentNames,
    ...validComponentNames.map(hyphenateTag),
  ])
  if (templateAst) {
    for (const node of forEachElementNode(templateAst)) {
      if (node.loc.end.offset <= spanTemplateRange.start || node.loc.start.offset >= (spanTemplateRange.start + spanTemplateRange.length)) {
        continue
      }
      if (components.has(node.tag)) {
        let start = node.loc.start.offset
        start += '<'.length
        result.push({
          start,
          length: node.tag.length,
        })
        if (!node.isSelfClosing) {
          result.push({
            start: node.loc.start.offset + node.loc.source.lastIndexOf(node.tag),
            length: node.tag.length,
          })
        }
      }
    }
  }
  return result
}
