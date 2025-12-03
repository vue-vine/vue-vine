// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import { injectCalledByNative } from './called-by-native'
import { setupLynxEnv } from './env'

// Setup Lynx environment (registers processData)
setupLynxEnv()

// Inject native-callable functions (registers renderPage, updatePage, etc.)
injectCalledByNative()

// Export public API
export { createLynxApp, render } from './renderer'
export * from './types'
export * from '@vue/runtime-core'
