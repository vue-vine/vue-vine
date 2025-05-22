import type { VirtualCode } from '@volar/language-server/node'
import type { VineDiagnostic, VineFileCtx } from '@vue-vine/compiler'

export interface BabelToken {
  start: number
  end: number
  type: {
    label: string
  }
}
export interface SpawnLogger {
  log: (msg: string) => void
  reset: () => void
}

export const VUE_VINE_VIRTUAL_CODE_ID = 'vue-vine-virtual-code'

export interface VueVineVirtualCode extends VirtualCode {
  __VUE_VINE_VIRTUAL_CODE__: true
  vineMetaCtx: {
    vineCompileErrs: VineDiagnostic[]
    vineCompileWarns: VineDiagnostic[]
    vineFileCtx: VineFileCtx
  }

  get fileName(): string
  get compileTime(): string
}

export function turnBackToCRLF(code: string): string {
  return code.replace(/\r?\n/g, '\r\n')
}

export function vlsInfoLog(...msgs: any[]): void {
  console.log(
    msgs.map((msg, i) => (
      i === 0
        ? `[vue-vine] ${msg}`
        : `${' '.repeat(3)}${
          i === msgs.length - 1
            ? '└─'
            : '├─'
        }${' '.repeat(6)}${msg}`
    )).join('\n'),
  )
}

export function VLS_ErrorLog(err: any, tag: string): void {
  console.log(
    `[vue-vine] ${tag} error: ${String(err)}`,
  )
  if (err.stack) {
    const stackLines = err.stack.split('\n')
    console.log('--- Error stack trace:')
    console.log(stackLines.join('\n'))
  }
}

export function createSpawnLogger(tag: string): SpawnLogger {
  let isHeadLine = true

  return {
    log: (msg: string) => {
      console.log(
        isHeadLine
          ? `[vue-vine] ${tag}: ${msg}`
          : `${' '.repeat(3)}├─${' '.repeat(6)}${msg}`,
      )
      if (isHeadLine) {
        isHeadLine = false
      }
    },
    reset: () => {
      isHeadLine = true
    },
  }
}

export function isVueVineVirtualCode(vCode: any): vCode is VueVineVirtualCode {
  return Boolean(vCode?.__VUE_VINE_VIRTUAL_CODE__)
}

const commentReg = /(?<=\/\*)[\s\S]*?(?=\*\/)|(?<=\/\/)[\s\S]*?(?=\n)/g
function fillBlank(css: string, ...regs: RegExp[]) {
  for (const reg of regs) {
    css = css.replace(reg, match => ' '.repeat(match.length))
  }
  return css
}

const cssClassNameReg = /(?=(\.[a-z_][-\w]*)[\s.,+~>:#)[{])/gi
const fragmentReg = /(?<=\{)[^{]*(?=(?<!\\);)/g

export function parseCssClassNames(css: string): {
  offset: number
  text: string
}[] {
  css = fillBlank(css, commentReg, fragmentReg)
  const matches = css.matchAll(cssClassNameReg)
  const classNames = []
  for (const match of matches) {
    const matchText = match[1]
    if (matchText) {
      classNames.push({
        offset: match.index,
        text: matchText,
      })
    }
  }
  return classNames
}
