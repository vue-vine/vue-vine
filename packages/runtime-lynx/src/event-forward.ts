// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Event forwarding for background thread.
 *
 * This module is intentionally minimal - it only contains the logic needed
 * to forward events from background thread to main thread.
 *
 * The full eventRegistry module (with handler storage) is NOT imported here
 * to keep the background bundle small.
 */

/**
 * Forward event to main thread via dispatchEvent.
 *
 * Unlike ReactLynx which uses rLynxChange for patch updates,
 * Vue Vine uses a direct message passing approach since Vue's
 * custom renderer runs entirely on the main thread.
 *
 * Uses lynx.getCoreContext().dispatchEvent() - the standard Lynx API
 * for background-to-main thread communication.
 */
export function forwardEventToMainThread(handlerSign: string, eventData: unknown): void {
  try {
    if (typeof lynx === 'undefined') {
      if (__DEV__) {
        console.warn('[Vue Vine Lynx] lynx is not defined')
      }
      return
    }

    // Use standard Lynx API for cross-thread communication
    // Background thread -> Main thread: getCoreContext().dispatchEvent()
    const coreContext = lynx.getCoreContext()

    // Dispatch custom event to main thread
    coreContext.dispatchEvent({
      type: 'vue-vine-event',
      data: JSON.stringify({
        handlerSign,
        eventData,
      }),
    })
  }
  catch (e) {
    console.error('[Vue Vine Lynx] Error forwarding event:', e)

    // Fallback: try global function (for testing/dev environments)
    try {
      if (typeof globalThis.vueVineHandleEvent === 'function') {
        globalThis.vueVineHandleEvent({
          type: 'vue-vine-event',
          handlerSign,
          eventData,
        })
      }
    }
    catch (fallbackError) {
      console.error('[Vue Vine Lynx] Fallback also failed:', fallbackError)
    }
  }
}

/**
 * Publish event - background thread version.
 * Always forwards to main thread since background thread has no event handlers.
 */
export function publishEventBackground(handlerSign: string, eventData: unknown): void {
  forwardEventToMainThread(handlerSign, eventData)
}
