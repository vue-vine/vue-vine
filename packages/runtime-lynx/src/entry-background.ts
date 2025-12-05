// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Background thread entry point for Vue Vine Lynx
 *
 * Background thread responsibilities:
 * - No PAPI access (cannot create/modify elements)
 * - Receives events from Lynx Native
 */

import { publishEventBackground } from './event-forward'

/**
 * Inject background thread specific functions
 */
function injectBackgroundHandlers(): void {
  // Inject to globalThis
  Object.assign(globalThis, {
    publishEvent: publishEventBackground,
  })
}

// Initialize background thread handlers
injectBackgroundHandlers()

// Include Vue runtime in background thread
export * from '@vue/runtime-core'
