export type VineVirtualFileExtension =
  | 'ts'
  | 'css'
  | 'scss'
  | 'sass'
  | 'less'
  | 'styl'
  | 'html'

export interface RequestResolver {
  resolve: (value: any) => void
  reject: (reason?: any) => void
  timeout?: NodeJS.Timeout
}

export interface PipelineContext {
  pendingRequests: Map<string, RequestResolver>
}

export interface HtmlTagInfo {
  events: string[]
  props: string[]
}
