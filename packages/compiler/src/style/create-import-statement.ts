import type { VineCompFnCtx, VineCompilerCtx, VineFileCtx, VineStyleMeta } from '../types'
import { getStyleLangFileExt, showIf } from '../utils'

export function createStyleImportStmt(
  compilerCtx: VineCompilerCtx,
  vineFileCtx: VineFileCtx,
  vineCompFnCtx: VineCompFnCtx,
  styleMeta: VineStyleMeta,
  index: number,
): string {
  const adapter = compilerCtx.options.runtimeAdapter

  if (styleMeta.isExternalFilePathSource) {
    if (!styleMeta.scoped) {
      // Just use the user-given style file path directly
      return `import ${showIf(
        // handle web component styles
        Boolean(vineCompFnCtx.isCustomElement),
        `__${vineCompFnCtx.fnName.toLowerCase()}_styles from `,
      )} '${styleMeta.source}';`
    }

    if (adapter) {
      // Use adapter for external style imports (with scoped)
      return adapter.generateStyleImport({
        fileId: styleMeta.source,
        vineFileId: vineFileCtx.fileId,
        scopeId: vineCompFnCtx.scopeId,
        compName: vineCompFnCtx.fnName,
        lang: styleMeta.lang,
        index,
        scoped: styleMeta.scoped,
        isExternal: true,
      })
    }

    // Default Vite format for external files
    const styleFileExt = styleMeta.source.slice(
      styleMeta.source.lastIndexOf('.'),
    )

    return [
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
  }

  if (adapter) {
    // Use adapter for inline styles
    return adapter.generateStyleImport({
      fileId: vineFileCtx.fileId,
      vineFileId: vineFileCtx.fileId,
      scopeId: vineCompFnCtx.scopeId,
      compName: vineCompFnCtx.fnName,
      lang: styleMeta.lang,
      index,
      scoped: styleMeta.scoped,
      isExternal: false,
    })
  }

  // Default Vite format for inline styles
  const styleLangExt = getStyleLangFileExt(styleMeta.lang)
  return [
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
}
