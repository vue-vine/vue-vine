import type { ArrowFunctionExpression, FunctionDeclaration, FunctionExpression } from '@babel/types'
import type { VirtualCode } from '@volar/language-core'
import type { VineDiagnostic, VineFileCtx } from '@vue-vine/compiler'
import type { VueCodeInformation } from '@vue/language-core'
import type { Segment } from 'muggle-string'
import type { analyzeVineForVirtualCode } from './vine-ctx'

export type VineCodeInformation = VueCodeInformation
export type Code = Segment<VineCodeInformation>
export type CodeSegment = Segment<VineCodeInformation>
export type VineCompFn = ReturnType<typeof analyzeVineForVirtualCode>['vineFileCtx']['vineCompFns'][number]
export type BabelFunctionNodeTypes = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression

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
  fileName: string
  vineMetaCtx: {
    vineCompileErrs: VineDiagnostic[]
    vineCompileWarns: VineDiagnostic[]
    vineFileCtx: VineFileCtx
  }
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

export function wrapWith(
  startOffset: number,
  endOffset: number,
  features: VueCodeInformation,
  codes: Code[],
): Code[] {
  const results: Code[] = []

  results.push(['', undefined, startOffset, features])
  let offset = 1
  for (const code of codes) {
    if (typeof code !== 'string') {
      offset++
    }
    results.push(code)
  }
  results.push(['', undefined, endOffset, { __combineOffset: offset }])

  return results
}
