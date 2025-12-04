// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import { executeEventHandler, publishEvent } from './event-registry'
import { executeMountToPage, isMountPending } from './renderer'

// Check if we're in main thread (has PAPI)

/**
 * Render the page - called by Lynx Native
 */
function renderPage(_data: unknown): void {
  // Create Lynx page element
  const page = __CreatePage('0', 0)

  // Execute pending mount if app.mount() was called
  if (isMountPending()) {
    executeMountToPage(page)
  }
}

/**
 * Update the page - called by Lynx Native when data changes.
 */
function updatePage(_data: unknown, _options?: UpdatePageOption): void {
  __FlushElementTree()
}

/**
 * Update global props
 */
function updateGlobalProps(_data: unknown, _options?: UpdatePageOption): void {
  __FlushElementTree()
}

/**
 * Handle Vue Vine event messages from background thread.
 * This is the main thread's receiver for cross-thread event communication.
 */
function vueVineHandleEvent(message: VueVineEventMessage): void {
  if (message.type === 'vue-vine-event') {
    executeEventHandler(message.handlerSign, message.eventData)
  }
}

/**
 * Inject native-callable functions to globalThis
 */
export function injectCalledByNative(): void {
  // Common functions for both threads
  Object.assign(globalThis, {
    renderPage,
    updatePage,
    updateGlobalProps,
    getPageData: () => ({}),
    removeComponents: () => {},
  } satisfies LynxCallByNative)

  // Thread-specific setup
  if (__MAIN_THREAD__) {
    // Main thread: expose event handling functions
    Object.assign(globalThis, {
      publishEvent,
      vueVineHandleEvent, // Vue Vine's cross-thread event handler
    })
  }
  else {
    // Background thread: inject to globalThis and lynxCoreInject.tt
    Object.assign(globalThis, {
      publishEvent,
    })

    // Also inject to lynxCoreInject.tt if available
    if (typeof lynxCoreInject !== 'undefined' && lynxCoreInject.tt) {
      lynxCoreInject.tt.publishEvent = publishEvent
      lynxCoreInject.tt.publicComponentEvent = (_componentId: string, handlerName: string, data: unknown) => {
        publishEvent(handlerName, data)
      }
    }
  }
}
