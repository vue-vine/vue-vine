import type { VueVineVirtualCode } from '@vue-vine/language-service'
import type ts from 'typescript'
import type { HtmlTagInfo } from '../types'
import type { getComponentDirectives } from './get-component-directives'
import type { getComponentProps } from './get-component-props'
import type { getDocumentHighlight } from './get-document-highlight'
import type { getElementAttrs } from './get-element-attrs'

export interface PipelineClientContext {
  // Template completions
  vineVirtualCode?: VueVineVirtualCode
  tagInfos?: Map<string, HtmlTagInfo>

  // Document highlight
  documentHighlights?: ts.DocumentHighlights[]
}

export interface PipelineInstance {
  getComponentProps: ReturnType<typeof getComponentProps>
  getComponentDirectives: ReturnType<typeof getComponentDirectives>
  getElementAttrs: ReturnType<typeof getElementAttrs>
  getDocumentHighlight: ReturnType<typeof getDocumentHighlight>
}
