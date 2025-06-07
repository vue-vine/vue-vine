export type VineVirtualFileExtension
  = | 'ts'
    | 'css'
    | 'scss'
    | 'sass'
    | 'less'
    | 'styl'
    | 'html'

export interface HtmlTagInfo {
  events: string[]
  props: string[]
}
