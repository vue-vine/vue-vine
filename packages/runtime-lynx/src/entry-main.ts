// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Main thread entry point for Vue Vine Lynx
 *
 * Main thread responsibilities:
 * - Has PAPI access (__CreateElement, __AddEvent, etc.)
 * - Runs Vue application and renders UI
 * - Stores event handlers in eventRegistry
 * - Receives forwarded events from background thread via postMessage
 * - Manages worklet runtime for main-thread script execution
 */

import { injectCalledByNative } from './called-by-native'
import { setupLynxEnv } from './env'
import { setupEventsReceive } from './event-receive'
import { initWorkletRuntime } from './worklet-runtime'

function bootstrapMainThread(): void {
  // Setup Lynx environment
  setupLynxEnv()

  injectCalledByNative()

  // Inject native-callable functions for main thread

  // Setup cross-thread message listener
  // Listen for events forwarded from background thread
  if (typeof lynx !== 'undefined') {
  // Initialize worklet runtime for main-thread script
    initWorkletRuntime()

    // Setup cross-thread message listener
    setupEventsReceive()
  }
}

try {
  bootstrapMainThread()
}
catch (e) {
  console.error('[Vue Vine Lynx] Failed to bootstrap main thread:', e)
}

// Export public API for Vue applications
export { createLynxApp, render } from './renderer'
