import type { SourceLocation } from '@babel/types'
import type { SourceLocation as VueSourceLocation } from '@vue/compiler-dom'
import type { VineCompFnCtx, VineDiagnostic, VineFileCtx } from './types'
import { createColorful } from './utils/color-string'

const whiteFgRedBg = createColorful(['white', 'bgRed'])
const whiteFgYellowBg = createColorful(['white', 'bgYellow'])
const redFgBold = createColorful(['red', 'bold'])

const ErrorLabel = whiteFgRedBg(' Error ')
const WarningLabel = whiteFgYellowBg(' Warning ')

export interface DiagnosticParams {
  msg: string
  location?: SourceLocation | null
  rawVueTemplateLocation?: VueSourceLocation | null
}
export interface MakeDiagnosticParams extends DiagnosticParams {
  fileId: string
  msgColorful: (str: string) => string
}
interface MakeDiagnosticContext {
  vineFileCtx: VineFileCtx
  vineCompFnCtx?: VineCompFnCtx
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

export function vineErr(
  { vineFileCtx, vineCompFnCtx }: MakeDiagnosticContext,
  { msg, location, rawVueTemplateLocation }: DiagnosticParams,
): VineDiagnostic {
  const full = makeDiagnostic(ErrorLabel, {
    msg,
    location,
    fileId: vineFileCtx.fileId,
    msgColorful: redFgBold,
  })
  return { full, msg, location, rawVueTemplateLocation, vineCompFnCtx }
}

export function vineWarn(
  { vineFileCtx, vineCompFnCtx }: MakeDiagnosticContext,
  { msg, location, rawVueTemplateLocation }: DiagnosticParams,
): VineDiagnostic {
  const full = makeDiagnostic(WarningLabel, {
    msg,
    location,
    fileId: vineFileCtx.fileId,
    msgColorful: whiteFgYellowBg,
  })
  return { full, msg, location, rawVueTemplateLocation, vineCompFnCtx }
}
