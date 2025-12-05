// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Layer names for Lynx dual-thread code splitting.
 * - MAIN_THREAD: UI rendering, PAPI calls, event handler storage
 * - BACKGROUND: Event forwarding, receives events from Lynx Native
 */
export const LAYERS = {
  MAIN_THREAD: 'vue-vine:main-thread',
  BACKGROUND: 'vue-vine:background',
} as const

export const PLUGIN_NAME = 'vue-vine-lynx'
export const PLUGIN_NAME_TEMPLATE = 'lynx:template'
export const DEFAULT_DIST_PATH_INTERMEDIATE = '.rspeedy'
