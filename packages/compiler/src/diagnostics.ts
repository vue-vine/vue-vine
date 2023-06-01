import type { Range } from '@ast-grep/napi'
import type { VineFileCtx } from './types'
import { createColorful } from './utils/color-string'

const whiteFgRedBg = createColorful(['white', 'bgRed'])
const whiteFgYellowBg = createColorful(['white', 'bgYellow'])
const redFgBold = createColorful(['red', 'bold'])

const ErrorLabel = whiteFgRedBg(' Error ')
const WarningLabel = whiteFgYellowBg(' Warning ')

export interface DiagnosticParams {
  msg: string
  range: Range
}
export interface MakeDiagnosticParams extends DiagnosticParams {
  fileId: string
  msgColorful: (str: string) => string
}

export interface VineDiagnostic extends DiagnosticParams {
  full: string
}

export function makeDiagnostic(label: string, { msg, fileId, range, msgColorful }: MakeDiagnosticParams) {
  const pos = range?.start
  const posString = pos
    ? `${pos.line + 1}:${pos.column + 1 /* ast-grep Position line/column is zero-based */}`
    : ''
  return `
${label} File: ${fileId} ${posString}
${msgColorful(msg)}
`
}

export function vineErr(vineFileCtx: VineFileCtx, { msg, range }: DiagnosticParams): VineDiagnostic {
  const full = makeDiagnostic(ErrorLabel, {
    msg,
    fileId: vineFileCtx.fileId,
    range,
    msgColorful: redFgBold,
  })
  return { full, msg, range }
}

export function vineWarn(vineFileCtx: VineFileCtx, { msg, range }: DiagnosticParams): VineDiagnostic {
  const full = makeDiagnostic(WarningLabel, {
    msg,
    fileId: vineFileCtx.fileId,
    range,
    msgColorful: whiteFgYellowBg,
  })
  return { full, msg, range }
}
