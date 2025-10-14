import type {
  RuntimeAdapter,
  RuntimeAdapterGenHMRCodeParams,
  RuntimeAdapterGenStyleImportParams,
  VineStyleLang,
} from '../types'
import { getStyleLangFileExt } from '../utils'

export class ViteRuntimeAdapter implements RuntimeAdapter {
  name = 'vite' as const

  generateHMRCode({ fileCtx, isDev }: RuntimeAdapterGenHMRCodeParams): string {
    if (!isDev)
      return ''

    const hmrCompFnsName = fileCtx.hmrCompFnsName ?? ''
    const renderOnly = fileCtx.renderOnly

    return `export const _rerender_only = ${renderOnly}
export const _rerender_vcf_fn_name = "${hmrCompFnsName}"
if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (!mod) { return; }
    const { _rerender_only, _rerender_vcf_fn_name } = mod;
    // Skip if no component name specified (initial load)
    if (!_rerender_vcf_fn_name || _rerender_vcf_fn_name === '') { return; }
    const component = mod[_rerender_vcf_fn_name];
    if (!component || !component.__hmrId) { return; }
    if (_rerender_only) {
      __VUE_HMR_RUNTIME__.rerender(component.__hmrId, component.render);
    } else {
      __VUE_HMR_RUNTIME__.reload(component.__hmrId, component);
    }
  });
}`
  }

  generateStyleImport({
    fileId,
    vineFileId,
    scopeId,
    compName,
    lang,
    index,
    scoped,
    isExternal,
  }: RuntimeAdapterGenStyleImportParams): string {
    // Get the correct style file extension
    const styleLangExt = getStyleLangFileExt(lang as VineStyleLang)

    if (isExternal) {
      // External style file: use the file path directly with vine-style-external type
      const styleFileExt = fileId.slice(fileId.lastIndexOf('.'))
      return `import '${fileId}?type=vine-style-external&vineFileId=${vineFileId}&scopeId=${scopeId}&comp=${compName}&lang=${lang}&index=${index}${scoped ? '&scoped=true' : ''}&virtual${styleFileExt}'`
    }

    // Inline style: remove .vine.ts suffix from fileId for the import path
    const importPath = fileId.replace(/\.vine\.ts$/, '')
    return `import '${importPath}?type=vine-style&vineFileId=${vineFileId}&scopeId=${scopeId}&comp=${compName}&lang=${lang}&index=${index}${scoped ? '&scoped=true' : ''}&virtual.${styleLangExt}'`
  }
}

export class RspackRuntimeAdapter implements RuntimeAdapter {
  name = 'rspack' as const

  generateHMRCode({ fileCtx, isDev }: RuntimeAdapterGenHMRCodeParams): string {
    if (!isDev)
      return ''

    const hmrCompFnName = fileCtx.hmrCompFnsName ?? ''
    const renderOnly = fileCtx.renderOnly

    // Rspack/Webpack HMR API - file level
    // The key insight: webpack re-executes the entire module on HMR,
    // so we need to check if this is an initial load or an update

    // Only generate HMR code if we have a component to update
    if (!hmrCompFnName || hmrCompFnName === '') {
      return `
if (module.hot) {
  module.hot.accept();
}
      `
    }

    return `
if (module.hot) {
  const _renderOnly = ${renderOnly};
  const _hmrCompFnName = "${hmrCompFnName}";

  // Get the component from module scope (it's already defined above)
  const component = typeof ${hmrCompFnName} !== 'undefined' ? ${hmrCompFnName} : undefined;

  if (component && component.__hmrId) {
    const hmrId = component.__hmrId;
    const api = __VUE_HMR_RUNTIME__;

    // Similar to vue-loader: createRecord returns false if already recorded
    // In that case, it's an HMR update, not initial load
    if (!api.createRecord(hmrId, component)) {
      // HMR update: reload or rerender based on change type
      if (_renderOnly) {
        api.rerender(hmrId, component.render);
      } else {
        api.reload(hmrId, component);
      }
    }
  }

  // Accept HMR updates
  module.hot.accept();
}
    `
  }

  generateStyleImport({
    fileId,
    vineFileId,
    scopeId,
    compName,
    lang,
    index,
    scoped,
    isExternal,
  }: RuntimeAdapterGenStyleImportParams): string {
    // Rspack virtual module format - use resourceQuery
    // For both inline and external styles, use the same query format
    // On Windows, we need to normalize the path to avoid ':' being treated as URI scheme
    const normalizedFileId = fileId.replace(/\\/g, '/')
    const normalizedVineFileId = vineFileId.replace(/\\/g, '/')
    return `import '${normalizedFileId}?vine-style&vineFileId=${normalizedVineFileId}&scopeId=${scopeId}&comp=${compName}&lang=${lang}&index=${index}${scoped ? '&scoped=true' : ''}${isExternal ? '&external=true' : ''}'`
  }
}
