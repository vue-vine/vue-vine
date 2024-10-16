import type { VineCompFnCtx, VineFileCtx, VineStyleMeta } from '../types'
import { getStyleLangFileExt, showIf } from '../utils'

export function createStyleImportStmt(
  vineFileCtx: VineFileCtx,
  vineCompFnCtx: VineCompFnCtx,
  styleMeta: VineStyleMeta,
  index: number,
) {
  if (styleMeta.isExternalFilePathSource) {
    if (!styleMeta.scoped) {
      // Just use the user-given style file path directly
      return `import ${showIf(
        // handle web component styles
        Boolean(vineCompFnCtx.isCustomElement),
        `__${vineCompFnCtx.fnName.toLowerCase()}_styles from `,
      )} '${styleMeta.source}';`
    }

    const styleFileExt = styleMeta.source.slice(
      styleMeta.source.lastIndexOf('.'),
    )
    return `import ${showIf(
      // handle web component styles
      Boolean(vineCompFnCtx.isCustomElement),
      `__${vineCompFnCtx.fnName.toLowerCase()}_styles from `,
    )}'${styleMeta.source}?vineFileId=${
      encodeURIComponent(vineFileCtx.fileId.replace(/\.vine\.ts$/, ''))
    }&type=vine-style-external&scopeId=${
      vineCompFnCtx.scopeId
    }&comp=${vineCompFnCtx.fnName}&lang=${
      styleMeta.lang
    }&index=${index}${
      showIf(
        Boolean(styleMeta.scoped),
        '&scoped=true',
      )
    }&virtual${styleFileExt}';`
  }

  const styleLangExt = getStyleLangFileExt(styleMeta.lang)
  return `import ${showIf(
    // handle web component styles
    Boolean(vineCompFnCtx.isCustomElement),
    `__${vineCompFnCtx.fnName.toLowerCase()}_styles from `,
  )}'${
    vineFileCtx.fileId.replace(/\.vine\.ts$/, '')
  }?type=vine-style&scopeId=${
    vineCompFnCtx.scopeId
  }&comp=${vineCompFnCtx.fnName}&lang=${
    styleMeta.lang
  }${
    showIf(
      Boolean(styleMeta.scoped),
      '&scoped=true',
    )
  }&index=${index}&virtual.${styleLangExt}';`
}
