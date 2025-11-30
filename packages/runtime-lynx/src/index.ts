// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import { injectCalledByNative } from './calledByNative'
import { setupLynxEnv } from './env'

// Setup Lynx environment (registers processData)
setupLynxEnv()

// Inject native-callable functions (registers renderPage, updatePage, etc.)
injectCalledByNative()

export function createApp(..._args: any[]): any {
  // Todo: ...
}
