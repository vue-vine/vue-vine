// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { VineFileCtx } from '../types'
import { createHash } from 'node:crypto'

/**
 * Generate a short unique worklet ID based on file path and function name
 */
function generateWorkletId(fileId: string, fnName: string, index: number): string {
  const hash = createHash('md5')
    .update(`${fileId}:${fnName}:${index}`)
    .digest('hex')
    .slice(0, 8)
  return `${hash}:${index}`
}

/**
 * Transform Lynx directive functions for dual-thread architecture.
 *
 * For 'main thread' functions:
 * - Extract function body to a separate variable
 * - Replace original variable with worklet object { _wkltId: "xxx" }
 * - Add registration call guarded by __MAIN_THREAD__ macro
 * - Remove the 'main thread' directive from function body
 *
 * For 'background only' functions:
 * - Wrap in conditional compilation: if (__BACKGROUND__) { ... }
 * - On main thread, function body will be eliminated by tree shaking
 *
 * This transformation generates conditional code that relies on:
 * - __MAIN_THREAD__: true in main-thread bundle, false in background bundle
 * - __BACKGROUND__: true in background bundle, false in main-thread bundle
 *
 * These macros are injected by rspeedy plugin via DefinePlugin.
 */
export function transformLynxDirectiveFunctions(vineFileCtx: VineFileCtx): void {
  const lynxCtx = vineFileCtx.lynx
  if (!lynxCtx || lynxCtx.directiveFns.length === 0) {
    return
  }

  const ms = vineFileCtx.fileMagicCode

  // Process each directive function
  lynxCtx.directiveFns.forEach((fnInfo, index) => {
    const { directive, fnName, fnNode, declNode, directiveNode } = fnInfo

    // Get declaration boundaries from AST
    const declStart = declNode.start!
    const declEnd = declNode.end!

    // Get function source (will be modified to remove directive)
    const fnStart = fnNode.start!
    const fnEnd = fnNode.end!
    let fnSource = vineFileCtx.originCode.slice(fnStart, fnEnd)

    // Remove directive from function source
    const directiveStart = directiveNode.start! - fnStart
    const directiveEnd = directiveNode.end! - fnStart
    fnSource = fnSource.slice(0, directiveStart) + fnSource.slice(directiveEnd)
    // Clean up any leading newline after directive removal
    fnSource = fnSource.replace(/^\s*\n/, '')

    if (directive === 'main thread') {
      // Generate unique worklet ID
      const workletId = generateWorkletId(vineFileCtx.fileId, fnName, index)

      // Generate internal function name for registration
      const internalFnName = `__vine_wklt_${fnName}_fn`

      // Build the transformed code:
      // const __vine_wklt_xxx_fn = (function without directive)
      // const xxx = { _wkltId: "..." }
      // if (__MAIN_THREAD__) { registerWorklet(...) }
      const workletObject = `{ _wkltId: "${workletId}" }`
      const registrationCode = `\nif (typeof __MAIN_THREAD__ !== 'undefined' && __MAIN_THREAD__) { globalThis.registerWorklet && globalThis.registerWorklet("main-thread", "${workletId}", ${internalFnName}); }`

      const transformedCode = `const ${internalFnName} = ${fnSource};\nconst ${fnName} = ${workletObject};${registrationCode}`

      // Replace the entire declaration using AST positions
      ms.overwrite(declStart, declEnd, transformedCode)
    }
    else if (directive === 'background only') {
      // Get original declaration source
      const originalDeclaration = vineFileCtx.originCode.slice(declStart, declEnd)

      // Wrap in conditional
      const wrappedCode = `let ${fnName}; if (typeof __BACKGROUND__ !== 'undefined' && __BACKGROUND__) { ${originalDeclaration} }`

      ms.overwrite(declStart, declEnd, wrappedCode)
    }
  })
}
