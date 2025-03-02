import type { PipelineRequest } from '@vue-vine/language-service'

export type VineVirtualFileExtension =
  | 'ts'
  | 'css'
  | 'scss'
  | 'sass'
  | 'less'
  | 'styl'
  | 'html'

export interface PipelineStatus {
  isFetchDone: boolean
  pendingRequest: Map<PipelineRequest['type'], Promise<void>>
}

export interface HtmlTagInfo {
  events: string[]
  props: string[]
}
