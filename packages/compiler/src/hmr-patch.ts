import type { VineFileCtx } from './types'

export interface HMRPatchResult {
  renderOnly: boolean
  hmrCompFnsName: string | null
  type?: 'style' | 'module' | null
  scopeId?: string
}

// Helper function for array comparison
function areStrArraysEqual(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length)
    return false
  return arr1.every((item, index) => item === arr2[index])
}

// Helper function to normalize line endings
function normalizeLineEndings(str: string): string {
  return str.replace(/\r\n/g, '\n')
}

/**
 * Analyze HMR patch between old and new VineFileCtx
 * Returns analysis result without modifying the input contexts
 */
export function analyzeHMRPatch(
  oldVFCtx: VineFileCtx,
  newVFCtx: VineFileCtx,
): HMRPatchResult {
  const result: HMRPatchResult = {
    renderOnly: true,
    hmrCompFnsName: null,
    type: null,
    scopeId: undefined,
  }

  const nVineCompFns = newVFCtx.vineCompFns
  const oVineCompFns = oldVFCtx.vineCompFns

  if (oVineCompFns.length !== nVineCompFns.length) {
    result.renderOnly = false
    return result
  }

  const oldFnNames = oVineCompFns.map(fn => fn.fnName)
  const newFnNames = nVineCompFns.map(fn => fn.fnName)

  if (!areStrArraysEqual(oldFnNames, newFnNames)) {
    result.renderOnly = false
    result.hmrCompFnsName = newFnNames.find(name => !oldFnNames.includes(name)) || null
    return result
  }

  const nStyleDefine = newVFCtx.styleDefine
  const oStyleDefine = oldVFCtx.styleDefine
  const nOriginCode = normalizeLineEndings(newVFCtx.originCode)
  const oOriginCode = normalizeLineEndings(oldVFCtx.originCode)

  for (let i = 0; i < nVineCompFns.length; i++) {
    const nCompFn = nVineCompFns[i]
    const oCompFn = oVineCompFns[i]

    if (
      (!oCompFn || !nCompFn)
      || (!oCompFn.fnItselfNode || !nCompFn.fnItselfNode)
    ) {
      continue
    }

    // If a previous component already requires full reload, stop checking
    if (result.renderOnly === false) {
      break
    }

    const nCompFnTemplate = normalizeLineEndings(nCompFn.templateSource || '')
    const oCompFnTemplate = normalizeLineEndings(oCompFn.templateSource || '')
    const nCompFnStyles = nStyleDefine[nCompFn.scopeId]?.map(style => style.source ?? '') || []
    const oCompFnStyles = oStyleDefine[oCompFn.scopeId]?.map(style => style.source ?? '') || []

    // 1. Get component function AST Node range for its code content
    const nCompFnCode = nOriginCode.substring(Number(nCompFn.fnItselfNode.start), Number(nCompFn.fnItselfNode.end))
    const oCompFnCode = oOriginCode.substring(Number(oCompFn.fnItselfNode.start), Number(oCompFn.fnItselfNode.end))

    // 2. Clean template content
    const nCompFnCodeNonTemplate = nCompFnCode.replace(nCompFnTemplate, '')
    const oCompFnCodeNonTemplate = oCompFnCode.replace(oCompFnTemplate, '')

    // 3. Clean style content
    let nCompFnCodePure = nCompFnCodeNonTemplate
    nCompFnStyles?.forEach((style) => {
      nCompFnCodePure = nCompFnCodePure.replace(style, '')
    })
    let oCompFnCodePure = oCompFnCodeNonTemplate
    oCompFnStyles?.forEach((style) => {
      oCompFnCodePure = oCompFnCodePure.replace(style, '')
    })

    // Compare with the remaining characters without style and template interference
    // 4. If not equal, it means that the script has changed
    if (nCompFnCodePure !== oCompFnCodePure) {
      result.hmrCompFnsName = nCompFn.fnName
      result.renderOnly = false
    }
    else if (nCompFnTemplate !== oCompFnTemplate) {
      // script equal, then compare template
      result.hmrCompFnsName = nCompFn.fnName
      result.renderOnly = true
    }
    else if (!areStrArraysEqual(nCompFnStyles, oCompFnStyles)) {
      // script and template equal, then compare style
      const oCssBindingsVariables = Object.keys(oCompFn.cssBindings || {})
      const nCssBindingsVariables = Object.keys(nCompFn.cssBindings || {})
      // No v-bind() before and after the change
      if (oCssBindingsVariables.length === 0 && nCssBindingsVariables.length === 0) {
        result.type = 'style'
        result.scopeId = nCompFn.scopeId
        // Pure style change - don't reload the component
        result.renderOnly = true
      }
      // The variables of v-bind() before and after the change are equal
      else if (areStrArraysEqual(oCssBindingsVariables, nCssBindingsVariables)) {
        result.type = 'style'
        result.scopeId = nCompFn.scopeId
        // Style with same v-bind variables - safe to keep renderOnly
        result.renderOnly = true
      }
      else {
        // v-bind() variables changed - need full reload
        result.type = 'module'
        result.renderOnly = false
      }
      result.hmrCompFnsName = nCompFn.fnName
      result.scopeId = nCompFn.scopeId
    }
  }

  // If the number of components is different,
  // it means that the module has breaking change
  if (oVineCompFns.length !== nVineCompFns.length) {
    result.hmrCompFnsName = null
    result.renderOnly = false
    return result
  }

  return result
}
