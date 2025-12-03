// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Event Registry for Vue Vine Lynx Runtime
 *
 * Architecture:
 * - Main thread: Has PAPI, runs Vue, registers event handlers
 * - Background thread: No PAPI, receives events from Lynx Native
 *
 * Event flow:
 * 1. Main thread: Vue binds event -> handler stored in eventHandlers Map -> __AddEvent with sign
 * 2. User interaction: Lynx Native detects event
 * 3. Lynx Native calls background thread's publishEvent(sign, data)
 * 4. Background thread: forwards event to main thread via callLepusMethod
 * 5. Main thread: looks up handler by sign and executes it
 */

type EventHandler = (...args: unknown[]) => void

let nextEventId = 1
const eventHandlers = new Map<string, EventHandler>()

// Check if we're in main thread (has PAPI)
function isMainThread(): boolean {
  return typeof __CreateElement !== 'undefined'
}

/**
 * Generate a unique handler sign for an event handler.
 */
export function generateHandlerSign(): string {
  const id = nextEventId++
  return `${id}:0:`
}

/**
 * Register an event handler and return its sign.
 * Only works in main thread where Vue runs.
 */
export function registerEventHandler(handler: EventHandler | string): string {
  if (typeof handler === 'string') {
    return handler
  }

  const sign = generateHandlerSign()
  eventHandlers.set(sign, handler)

  if (__DEV__) {
    console.log(`[EventRegistry] Registered handler: ${sign}, total: ${eventHandlers.size}`)
  }

  return sign
}

/**
 * Unregister an event handler by its sign.
 */
export function unregisterEventHandler(sign: string): void {
  eventHandlers.delete(sign)
}

/**
 * Get event handler by sign (main thread only).
 */
export function getEventHandler(sign: string): EventHandler | undefined {
  return eventHandlers.get(sign)
}

/**
 * Execute event handler in main thread.
 * Called directly in main thread, or via callLepusMethod from background thread.
 */
export function executeEventHandler(handlerSign: string, eventData: unknown): void {
  const handler = getEventHandler(handlerSign)
  if (handler) {
    try {
      handler(eventData)
    }
    catch (e) {
      console.error('[Vue Vine Lynx] Error in event handler:', e)
      if (typeof lynx !== 'undefined' && lynx.reportError) {
        lynx.reportError(e as Error)
      }
    }
  }
  else {
    if (__DEV__) {
      console.warn(`[Vue Vine Lynx] Event handler not found for sign: ${handlerSign}`)
    }
  }
}

/**
 * Publish event - the entry point for event handling.
 *
 * Behavior depends on thread:
 * - Main thread: directly execute the handler
 * - Background thread: forward to main thread via callLepusMethod
 */
export function publishEvent(handlerSign: string, eventData: unknown): void {
  if (__DEV__) {
    console.log(`[EventRegistry] publishEvent: sign=${handlerSign}, isMainThread=${isMainThread()}`)
  }

  if (isMainThread()) {
    // Main thread: directly execute
    executeEventHandler(handlerSign, eventData)
  }
  else {
    // Background thread: forward to main thread
    forwardEventToMainThread(handlerSign, eventData)
  }
}

/**
 * Forward event from background thread to main thread.
 * Uses Lynx's rLynxChange (patchUpdate) mechanism.
 */
function forwardEventToMainThread(handlerSign: string, eventData: unknown): void {
  console.log(`[EventRegistry] Forwarding event to main thread: ${handlerSign}`)

  try {
    if (typeof lynx !== 'undefined' && lynx.getNativeApp) {
      const nativeApp = lynx.getNativeApp()
      if (nativeApp && nativeApp.callLepusMethod) {
        // Use rLynxChange (Lynx's patchUpdate method) which is a supported method name
        // Main thread should have a handler registered for this
        nativeApp.callLepusMethod(
          'rLynxChange', // This is LifecycleConstant.patchUpdate in ReactLynx
          { __vineEvent__: { handlerSign, eventData } },
          () => {
            console.log(`[EventRegistry] callLepusMethod callback executed: ${handlerSign}`)
          },
        )
        return
      }
    }

    console.warn('[Vue Vine Lynx] Cannot forward event to main thread: callLepusMethod not available')
  }
  catch (e) {
    console.error('[Vue Vine Lynx] Error forwarding event to main thread:', e)
  }
}

/**
 * Clear all event handlers.
 */
export function clearEventHandlers(): void {
  eventHandlers.clear()
  nextEventId = 1
}
