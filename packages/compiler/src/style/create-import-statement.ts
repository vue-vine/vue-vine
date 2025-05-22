import type { VineCompFnCtx, VineFileCtx, VineStyleMeta } from '../types'
import { getStyleLangFileExt, showIf } from '../utils'

export function createStyleImportStmt(
  vineFileCtx: VineFileCtx,
  vineCompFnCtx: VineCompFnCtx,
  styleMeta: VineStyleMeta,
  index: number,
): string {
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

    const importStmt = [
      'import ',
      vineCompFnCtx.isCustomElement ? `__${vineCompFnCtx.fnName.toLowerCase()}_styles from '` : '\'',
      `${styleMeta.source}?`,
      `type=vine-style-external`,
      `&vineFileId=${vineFileCtx.fileId}`,
      `&scopeId=${vineCompFnCtx.scopeId}`,
      `&comp=${vineCompFnCtx.fnName}`,
      `&lang=${styleMeta.lang}`,
      styleMeta.scoped ? `&scoped=true` : '',
      `&index=${index}`,
      `&virtual${styleFileExt}'`,
    ].filter(Boolean).join('')

    return importStmt
  }

  const styleLangExt = getStyleLangFileExt(styleMeta.lang)
  const importStmt = [
    'import ',
    vineCompFnCtx.isCustomElement ? `__${vineCompFnCtx.fnName.toLowerCase()}_styles from '` : '\'',
    `${vineFileCtx.fileId.replace(/\.vine\.ts$/, '')}?`,
    `type=vine-style`,
    `&vineFileId=${vineFileCtx.fileId}`,
    `&scopeId=${vineCompFnCtx.scopeId}`,
    `&comp=${vineCompFnCtx.fnName}`,
    `&lang=${styleMeta.lang}`,
    styleMeta.scoped ? `&scoped=true` : '',
    `&index=${index}`,
    `&virtual.${styleLangExt}'`,
  ].filter(Boolean).join('')

  return importStmt
}
