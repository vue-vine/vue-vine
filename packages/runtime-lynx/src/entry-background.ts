// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Background thread entry point for Vue Vine Lynx
 *
 * Background thread responsibilities:
 * - No PAPI access (cannot create/modify elements)
 * - Receives events from Lynx Native via publishEvent
 * - Forwards events to main thread via callLepusMethod('rLynxChange', ...)
 *
 * Note: The full Vue runtime is NOT needed here since:
 * - All rendering happens in main thread
 * - Background thread only handles event forwarding
 *
 * This entry uses event-forward.ts instead of eventRegistry.ts
 * to keep the bundle minimal.
 */

import { publishEventBackground } from './event-forward'

// Lifecycle constants (inline to avoid importing extra modules)
const LIFECYCLE_PUBLISH_EVENT = 'rLynxPublishEvent'
const LIFECYCLE_GLOBAL_EVENT = 'globalEventFromLepus'

/**
 * Handle lifecycle events from Lynx Native
 */
function onLifecycleEvent([type, data]: [string, unknown]): void {
  try {
    switch (type) {
      case LIFECYCLE_PUBLISH_EVENT: {
        const { handlerName, data: eventData } = data as { handlerName: string, data: unknown }
        publishEventBackground(handlerName, eventData)
        break
      }
      case LIFECYCLE_GLOBAL_EVENT: {
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
 * Inject background thread specific functions
 */
function injectBackgroundHandlers(): void {
  // Inject to globalThis
  Object.assign(globalThis, {
    publishEvent: publishEventBackground,
    publicComponentEvent: (_componentId: string, handlerName: string, data: unknown) => {
      publishEventBackground(handlerName, data)
    },
    onLifecycleEvent,
  })

  // Also inject to lynxCoreInject.tt if available
  if (typeof lynxCoreInject !== 'undefined' && lynxCoreInject.tt) {
    lynxCoreInject.tt.OnLifecycleEvent = onLifecycleEvent
    lynxCoreInject.tt.publishEvent = publishEventBackground
    lynxCoreInject.tt.publicComponentEvent = (_componentId: string, handlerName: string, data: unknown) => {
      publishEventBackground(handlerName, data)
    }
  }
}

// Initialize background thread handlers
injectBackgroundHandlers()
