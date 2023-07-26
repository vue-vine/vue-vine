import type { SourceLocation } from '@babel/types'
import type { VineDiagnostic, VineFileCtx } from './types'
import { createColorful } from './utils/color-string'

const whiteFgRedBg = createColorful(['white', 'bgRed'])
const whiteFgYellowBg = createColorful(['white', 'bgYellow'])
const redFgBold = createColorful(['red', 'bold'])

const ErrorLabel = whiteFgRedBg(' Error ')
const WarningLabel = whiteFgYellowBg(' Warning ')

export interface DiagnosticParams {
  msg: string
  location?: SourceLocation | null
}
export interface MakeDiagnosticParams extends DiagnosticParams {
  fileId: string
  msgColorful: (str: string) => string
}

export function makeDiagnostic(label: string, { msg, fileId, location, msgColorful }: MakeDiagnosticParams) {
  const pos = location?.start
  const posString = pos
    ? `${pos.line}:${pos.column}`
    : ''
  return `
${label} File: ${fileId} ${posString}
${msgColorful(msg)}
`
}

export function vineErr(vineFileCtx: VineFileCtx, { msg, location }: DiagnosticParams): VineDiagnostic {
  const full = makeDiagnostic(ErrorLabel, {
    msg,
    fileId: vineFileCtx.fileId,
    location,
    msgColorful: redFgBold,
  })
  return { full, msg, location }
}

export function vineWarn(vineFileCtx: VineFileCtx, { msg, location }: DiagnosticParams): VineDiagnostic {
  const full = makeDiagnostic(WarningLabel, {
    msg,
    fileId: vineFileCtx.fileId,
    location,
    msgColorful: whiteFgYellowBg,
  })
  return { full, msg, location }
}
