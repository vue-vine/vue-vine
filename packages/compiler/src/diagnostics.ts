import type { VineFileCtx } from './types'
import { createColorful } from './utils/color-string'

const whiteFgRedBg = createColorful(['white', 'bgRed'])
const whiteFgYellowBg = createColorful(['white', 'bgYellow'])
const redFgBold = createColorful(['red', 'bold'])

const ErrorLabel = whiteFgRedBg(' Error ')
const WarningLabel = whiteFgYellowBg(' Warning ')

// eslint-disable-next-line unused-imports/no-unused-vars
const spaces = (len: number) => ' '.repeat(len)

export interface Position {
  line: number
  column: number
}
export interface DiagnosticParams {
  msg: string
  pos?: Position
}
export interface MakeDiagnosticParams extends DiagnosticParams {
  fileId: string
  msgColorful: (str: string) => string
}

export function makeDiagnostic(label: string, { msg, fileId, pos, msgColorful }: MakeDiagnosticParams) {
  const posString = pos
    ? `${pos.line + 1}:${pos.column + 1 /* ast-grep Position line/column is zero-based */}`
    : ''
  return `
${label} File: ${fileId} ${posString}
${msgColorful(msg)}
`
}

export function vineErr(vineFileCtx: VineFileCtx, { msg, pos }: DiagnosticParams) {
  return makeDiagnostic(ErrorLabel, {
    msg,
    fileId: vineFileCtx.fileId,
    pos,
    msgColorful: redFgBold,
  })
}

export function vineWarn(vineFileCtx: VineFileCtx, { msg, pos }: DiagnosticParams) {
  return makeDiagnostic(WarningLabel, {
    msg,
    fileId: vineFileCtx.fileId,
    pos,
    msgColorful: whiteFgYellowBg,
  })
}
