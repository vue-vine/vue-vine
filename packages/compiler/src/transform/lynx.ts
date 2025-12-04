/* eslint-disable unused-imports/no-unused-vars */
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
  return hash
}

/**
 * Transform Lynx directive functions for dual-thread architecture.
 *
 * For 'main thread' functions:
 * - Add _wkltId property for worklet identification
 * - The actual function runs on main thread, worklet object reference is used in background
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

  // To be implemented ...
}
