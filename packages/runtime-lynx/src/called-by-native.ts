// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { ELifecycleConstant } from './lifecycle/life-cycle-constants'
import { executeEventHandler, publishEvent } from './eventRegistry'
import { jsReady } from './lifecycle/js-ready'
import { LifecycleConstant } from './lifecycle/life-cycle-constants'
import { executeMountToPage, isMountPending } from './renderer'

// Check if we're in main thread (has PAPI)
function isMainThread(): boolean {
  return typeof __CreateElement !== 'undefined'
}

/**
 * Render the page - called by Lynx Native
 */
function renderPage(data: unknown): void {
  lynx.__initData = (data as Record<string, unknown>) || {}

  // Create Lynx page element
  const page = __CreatePage('0', 0)

  // Execute pending mount if app.mount() was called
  if (isMountPending()) {
    executeMountToPage(page)
  }
}

/**
 * Update the page - called by Lynx Native when data changes.
 * Also handles event forwarding from background thread via __vineEvent__ marker.
 */
function updatePage(data: unknown, options?: UpdatePageOption): void {
  // Check if this is an event forwarded from background thread
  if (data && typeof data === 'object' && '__vineEvent__' in data) {
    const { handlerSign, eventData } = (data as { __vineEvent__: { handlerSign: string, eventData: unknown } }).__vineEvent__
    executeEventHandler(handlerSign, eventData)
    return
  }

  // Normal updatePage logic
  if (options?.resetPageData) {
    lynx.__initData = {}
  }

  if (typeof data === 'object' && data !== null) {
    Object.assign(lynx.__initData, data)
  }

  __FlushElementTree()
}

/**
 * Update global props
 */
function updateGlobalProps(_data: unknown, _options?: UpdatePageOption): void {
  __FlushElementTree()
}

/**
 * Handle rLynxChange (patchUpdate) from background thread.
 * This is called via callLepusMethod('rLynxChange', ...) from background thread.
 * We use this to forward events from background thread to main thread.
 */
function rLynxChange(data: unknown): void {
  // Check if this is an event forwarded from background thread
  if (data && typeof data === 'object' && '__vineEvent__' in data) {
    const { handlerSign, eventData } = (data as { __vineEvent__: { handlerSign: string, eventData: unknown } }).__vineEvent__
    executeEventHandler(handlerSign, eventData)
  }
}

/**
 * Handle lifecycle events from Lynx Native.
 * This is used in background thread to receive events.
 */
function onLifecycleEvent([type, data]: [ELifecycleConstant, unknown]): void {
  try {
    switch (type) {
      case LifecycleConstant.publishEvent: {
        const { handlerName, data: eventData } = data as { handlerName: string, data: unknown }
        publishEvent(handlerName, eventData)
        break
      }
      case LifecycleConstant.globalEventFromLepus: {
        const [eventName, params] = data as [string, Record<string, unknown>]
        if (typeof lynx !== 'undefined' && lynx.getJSModule) {
          lynx.getJSModule('GlobalEventEmitter')?.trigger?.(eventName, params)
        }
        break
      }
      default:
        break
    }
  }
  catch (e) {
    console.error('[Vue Vine Lynx] Error in onLifecycleEvent:', e)
    if (typeof lynx !== 'undefined' && lynx.reportError) {
      lynx.reportError(e as Error)
    }
  }
}

/**
 * Inject native-callable functions to globalThis
 */
export function injectCalledByNative(): void {
  const inMain = isMainThread()

  // Common functions for both threads
  const calledByNative: LynxCallByNative = {
    renderPage,
    updatePage,
    updateGlobalProps,
    getPageData: () => lynx.__initData,
    removeComponents: () => {},
  }

  Object.assign(globalThis, calledByNative)
  Object.assign(globalThis, { jsReady })

  // Thread-specific setup
  if (inMain) {
    // Main thread: expose event handling functions
    Object.assign(globalThis, {
      publishEvent,
      publicComponentEvent: (_componentId: string, handlerName: string, data: unknown) => {
        publishEvent(handlerName, data)
      },
      onLifecycleEvent,
      rLynxChange,
    })
  }
  else {
    // Background thread: inject to globalThis and lynxCoreInject.tt
    Object.assign(globalThis, {
      publishEvent,
      publicComponentEvent: (_componentId: string, handlerName: string, data: unknown) => {
        publishEvent(handlerName, data)
      },
      onLifecycleEvent,
    })

    // Also inject to lynxCoreInject.tt if available
    if (typeof lynxCoreInject !== 'undefined' && lynxCoreInject.tt) {
      lynxCoreInject.tt.OnLifecycleEvent = onLifecycleEvent
      lynxCoreInject.tt.publishEvent = publishEvent
      lynxCoreInject.tt.publicComponentEvent = (_componentId: string, handlerName: string, data: unknown) => {
        publishEvent(handlerName, data)
      }
    }
  }
}

