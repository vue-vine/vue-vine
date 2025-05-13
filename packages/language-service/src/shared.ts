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

export interface VueVineCode extends VirtualCode {
  __VUE_VINE_VIRTUAL_CODE__: true
  vineMetaCtx: {
    vineCompileErrs: VineDiagnostic[]
    vineCompileWarns: VineDiagnostic[]
    vineFileCtx: VineFileCtx
  }

  get fileName(): string
  get compileTime(): string
}

export function turnBackToCRLF(code: string) {
  return code.replace(/\r?\n/g, '\r\n')
}

export function vlsInfoLog(...msgs: any[]) {
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

export function VLS_ErrorLog(err: any, tag: string) {
  console.log(
    `[vue-vine] ${tag} error: ${String(err)}`,
  )
  if (err.stack) {
    const stackLines = err.stack.split('\n')
    console.log('--- Error stack trace:')
    console.log(stackLines.join('\n'))
  }
}

export function createSpawnLogger(tag: string) {
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

export function isVueVineVirtualCode(vCode: any): vCode is VueVineCode {
  return Boolean(vCode?.__VUE_VINE_VIRTUAL_CODE__)
}
