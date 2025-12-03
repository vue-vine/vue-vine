// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Main thread entry point for Vue Vine Lynx
 *
 * Main thread responsibilities:
 * - Has PAPI access (__CreateElement, __AddEvent, etc.)
 * - Runs Vue application and renders UI
 * - Stores event handlers in eventRegistry
 * - Receives forwarded events from background thread via rLynxChange
 */

import { injectCalledByNative } from './called-by-native'
import { setupLynxEnv } from './env'

// Setup Lynx environment
setupLynxEnv()

// Inject native-callable functions for main thread
injectCalledByNative()

// Export public API for Vue applications
export { createLynxApp, render } from './renderer'
export * from './types'
export * from '@vue/runtime-core'

