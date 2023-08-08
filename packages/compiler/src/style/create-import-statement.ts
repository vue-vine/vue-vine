import type { VineCompFnCtx, VineFileCtx, VineStyleMeta } from '../types'
import { getStyleLangFileExt, showIf } from '../utils'

export function createStyleImportStmt(
  vineFileCtx: VineFileCtx,
  vineCompFnCtx: VineCompFnCtx,
  styleDefine: VineStyleMeta,
) {
  const styleLangExt = getStyleLangFileExt(styleDefine.lang)
  return `import ${showIf(
    // handle web component styles
    Boolean(vineCompFnCtx.isCustomElement),
    `__${vineCompFnCtx.fnName.toLowerCase()}_styles from `,
  )}'${
    vineFileCtx.fileId.replace(/\.vine\.ts$/, '')
  }?type=vine-style&scopeId=${
    vineCompFnCtx.scopeId
  }&comp=${vineCompFnCtx.fnName}&lang=${
    styleDefine.lang
  }${
    showIf(
      Boolean(styleDefine.scoped),
      '&scoped=true',
    )
  }&virtual.${styleLangExt}';`
}
