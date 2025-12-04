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
 */

import { injectCalledByNative } from './called-by-native'
import { setupLynxEnv } from './env'

// Setup Lynx environment
setupLynxEnv()

// Inject native-callable functions for main thread
injectCalledByNative()

// Setup cross-thread message listener
// Listen for events forwarded from background thread
if (typeof lynx !== 'undefined') {
  try {
    // Main thread uses getJSContext() to receive messages from background thread
    const jsContext = lynx.getJSContext()

    // Listen for custom event type 'vue-vine-event'
    jsContext.addEventListener('vue-vine-event', (event) => {
      try {
        // Parse the message data
        const messageData = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data

        if (messageData && messageData.handlerSign) {
          if (typeof globalThis.vueVineHandleEvent === 'function') {
            globalThis.vueVineHandleEvent({
              type: 'vue-vine-event',
              handlerSign: messageData.handlerSign,
              eventData: messageData.eventData,
            })
          }
        }
      }
      catch (e) {
        console.error('[Vue Vine Lynx] Error handling received event:', e)
      }
    })
  }
  catch (e) {
    console.error('[Vue Vine Lynx] Failed to setup message listener:', e)
  }
}

// Export public API for Vue applications
export { createLynxApp, render } from './renderer'
export * from './types'
export * from '@vue/runtime-core'
