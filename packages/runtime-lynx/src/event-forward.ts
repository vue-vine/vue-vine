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
 * Forward event to main thread via callLepusMethod.
 * Uses Lynx's rLynxChange (patchUpdate) mechanism.
 */
export function forwardEventToMainThread(handlerSign: string, eventData: unknown): void {
  try {
    if (typeof lynx !== 'undefined' && lynx.getNativeApp) {
      const nativeApp = lynx.getNativeApp()
      if (nativeApp?.callLepusMethod) {
        nativeApp.callLepusMethod(
          'rLynxChange',
          { __vineEvent__: { handlerSign, eventData } },
        )
        return
      }
    }

    if (__DEV__) {
      console.warn('[Vue Vine Lynx] Cannot forward event: callLepusMethod not available')
    }
  }
  catch (e) {
    console.error('[Vue Vine Lynx] Error forwarding event:', e)
  }
}

/**
 * Publish event - background thread version.
 * Always forwards to main thread since background thread has no event handlers.
 */
export function publishEventBackground(handlerSign: string, eventData: unknown): void {
  forwardEventToMainThread(handlerSign, eventData)
}
