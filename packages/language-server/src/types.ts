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

export interface HtmlTagInfo {
  events: string[]
  props: string[]
}
